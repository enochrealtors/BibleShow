use cpal::{
    SampleFormat,
    traits::{DeviceTrait, HostTrait, StreamTrait},
};
use serde::Serialize;
use sherpa_onnx::{
    LinearResampler, OfflineRecognizer, OfflineRecognizerConfig, OfflineWhisperModelConfig,
    OnlineRecognizer, OnlineRecognizerConfig,
};
use std::{
    path::{Path, PathBuf},
    sync::{Arc, Mutex, mpsc},
    thread,
    time::Duration,
};
use tauri::{Emitter, Manager};

const MODEL_DIR: &str = "speech-models";
const CHUNK_SAMPLES: usize = 3_200;
const WHISPER_MAX_UTTERANCE_SECONDS: usize = 45;

#[derive(Clone, Serialize)]
pub struct AudioInput {
    index: usize,
    name: String,
    is_default: bool,
}

#[derive(Clone, Serialize)]
struct SpeechEvent {
    text: String,
    final_segment: bool,
    authoritative: bool,
    engine: &'static str,
    alternatives: Vec<String>,
}

struct WhisperJob {
    samples: Vec<f32>,
    sample_rate: i32,
    fallback_text: String,
}

#[derive(Clone, Serialize)]
struct SpeechStatus {
    status: &'static str,
    message: Option<String>,
}

#[derive(Default)]
pub struct SpeechRecognitionState {
    stop: Arc<Mutex<Option<mpsc::Sender<()>>>>,
}

fn emit_status(app: &tauri::AppHandle, status: &'static str, message: Option<String>) {
    let _ = app.emit("bible-speech-status", SpeechStatus { status, message });
}

#[tauri::command]
pub fn list_audio_inputs() -> Result<Vec<AudioInput>, String> {
    let host = cpal::default_host();
    let default_name = host
        .default_input_device()
        .and_then(|device| device.name().ok());
    host.input_devices()
        .map_err(|error| format!("Could not list microphone inputs: {error}"))?
        .enumerate()
        .map(|(index, device)| {
            let name = device
                .name()
                .map_err(|error| format!("Could not read microphone name: {error}"))?;
            Ok(AudioInput {
                index,
                is_default: default_name.as_deref() == Some(name.as_str()),
                name,
            })
        })
        .collect()
}

#[tauri::command]
pub fn start_bible_microphone(
    app: tauri::AppHandle,
    state: tauri::State<'_, SpeechRecognitionState>,
    device_index: Option<usize>,
    engine: String,
    language: String,
) -> Result<(), String> {
    if !matches!(engine.as_str(), "streaming" | "combined") {
        return Err("Choose a supported speech recognition mode.".into());
    }
    if !matches!(language.as_str(), "en" | "auto") {
        return Err("Choose English or automatic language detection.".into());
    }
    let (stop_tx, stop_rx) = mpsc::channel();
    {
        let mut active = state
            .stop
            .lock()
            .map_err(|_| "Microphone state is unavailable.".to_string())?;
        if active.is_some() {
            return Err("Bible detection is already listening to a microphone.".into());
        }
        *active = Some(stop_tx);
    }

    let state_ref = Arc::clone(&state.stop);
    let app_ref = app.clone();
    let spawned = thread::Builder::new()
        .name("bibleshow-bible-microphone".into())
        .spawn(move || {
            let result =
                recognize_from_microphone(app_ref.clone(), device_index, engine, language, stop_rx);
            if let Ok(mut active) = state_ref.lock() {
                *active = None;
            }
            match result {
                Ok(()) => emit_status(&app_ref, "stopped", Some("Microphone is stopped.".into())),
                Err(error) => emit_status(&app_ref, "error", Some(error)),
            }
        });

    if let Err(error) = spawned {
        if let Ok(mut active) = state.stop.lock() {
            *active = None;
        }
        return Err(format!("Could not start Bible detection: {error}"));
    }
    Ok(())
}

#[tauri::command]
pub fn stop_bible_microphone(
    state: tauri::State<'_, SpeechRecognitionState>,
) -> Result<(), String> {
    let stop = state
        .stop
        .lock()
        .map_err(|_| "Microphone state is unavailable.".to_string())?
        .take();
    if let Some(stop) = stop {
        let _ = stop.send(());
    }
    Ok(())
}

fn model_root(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let candidates = [
        app.path()
            .resource_dir()
            .ok()
            .map(|path| path.join(MODEL_DIR)),
        Some(
            PathBuf::from(env!("CARGO_MANIFEST_DIR"))
                .join("resources")
                .join(MODEL_DIR),
        ),
    ];
    candidates
        .into_iter()
        .flatten()
        .find(|directory| model_files_exist(directory))
        .ok_or_else(|| "The offline speech model is not installed in this build.".into())
}

fn model_files_exist(directory: &Path) -> bool {
    [
        "encoder-epoch-99-avg-1.int8.onnx",
        "decoder-epoch-99-avg-1.onnx",
        "joiner-epoch-99-avg-1.int8.onnx",
        "tokens.txt",
    ]
    .iter()
    .all(|file| directory.join(file).is_file())
}

fn recognize_from_microphone(
    app: tauri::AppHandle,
    device_index: Option<usize>,
    engine: String,
    language: String,
    stop_rx: mpsc::Receiver<()>,
) -> Result<(), String> {
    let model_dir = model_root(&app)?;
    let host = cpal::default_host();
    let mut devices = host
        .input_devices()
        .map_err(|error| format!("Could not list microphones: {error}"))?;
    let device = match device_index {
        Some(index) => devices.nth(index).ok_or_else(|| {
            "The selected microphone is no longer available. Refresh the microphone list."
                .to_string()
        })?,
        None => host
            .default_input_device()
            .ok_or_else(|| "No microphone input is available.".to_string())?,
    };
    let config = device
        .default_input_config()
        .map_err(|error| format!("Could not open microphone input: {error}"))?;
    let channels = config.channels() as usize;
    let sample_rate = config.sample_rate().0 as i32;
    if channels == 0 || sample_rate <= 0 {
        return Err("The selected microphone reported an invalid audio format.".into());
    }

    let mut recognizer_config = OnlineRecognizerConfig::default();
    recognizer_config.model_config.transducer.encoder = Some(
        model_dir
            .join("encoder-epoch-99-avg-1.int8.onnx")
            .to_string_lossy()
            .into_owned(),
    );
    recognizer_config.model_config.transducer.decoder = Some(
        model_dir
            .join("decoder-epoch-99-avg-1.onnx")
            .to_string_lossy()
            .into_owned(),
    );
    recognizer_config.model_config.transducer.joiner = Some(
        model_dir
            .join("joiner-epoch-99-avg-1.int8.onnx")
            .to_string_lossy()
            .into_owned(),
    );
    recognizer_config.model_config.tokens =
        Some(model_dir.join("tokens.txt").to_string_lossy().into_owned());
    recognizer_config.model_config.provider = Some("cpu".into());
    recognizer_config.model_config.num_threads = if engine == "combined" { 1 } else { 2 };
    recognizer_config.decoding_method = Some("greedy_search".into());
    recognizer_config.enable_endpoint = true;
    let recognizer = OnlineRecognizer::create(&recognizer_config)
        .ok_or_else(|| "The offline speech model could not be initialized.".to_string())?;
    let whisper_tx = if engine == "combined" {
        Some(start_whisper_worker(
            app.clone(),
            model_dir.clone(),
            language.clone(),
        )?)
    } else {
        None
    };
    let stream = recognizer.create_stream();
    let (audio_tx, audio_rx) = mpsc::sync_channel::<Vec<f32>>(64);
    let audio_stream = build_audio_stream(&device, &config, channels, audio_tx)?;
    audio_stream
        .play()
        .map_err(|error| format!("Could not start microphone capture: {error}"))?;
    emit_status(
        &app,
        "listening",
        Some(format!(
            "Listening on {} · {}",
            device.name().unwrap_or_else(|_| "microphone".into()),
            if engine == "combined" {
                if language == "auto" {
                    "streaming + multilingual Whisper"
                } else {
                    "streaming + English Whisper"
                }
            } else {
                "streaming sherpa-onnx"
            }
        )),
    );

    let mut samples = Vec::with_capacity(CHUNK_SAMPLES * 2);
    let mut utterance_samples = Vec::new();
    let mut whisper_audio_truncated = false;
    let mut last_hypothesis = String::new();
    loop {
        if stop_rx.try_recv().is_ok() {
            drop(audio_stream);
            for chunk in audio_rx.try_iter() {
                append_utterance_audio(
                    &mut utterance_samples,
                    &mut whisper_audio_truncated,
                    &chunk,
                    sample_rate,
                );
                samples.extend(chunk);
            }
            if !samples.is_empty() {
                stream.accept_waveform(sample_rate, &samples);
            }
            stream.input_finished();
            while recognizer.is_ready(&stream) {
                recognizer.decode(&stream);
            }
            if let Some(result) = recognizer.get_result(&stream) {
                let text = result.text.trim().to_string();
                if !text.is_empty() {
                    let _ = app.emit(
                        "bible-speech-transcript",
                        SpeechEvent {
                            text: text.clone(),
                            final_segment: true,
                            authoritative: engine == "streaming",
                            engine: "sherpa-onnx",
                            alternatives: Vec::new(),
                        },
                    );
                    if engine == "combined" {
                        let whisper_job = WhisperJob {
                            samples: std::mem::take(&mut utterance_samples),
                            sample_rate,
                            fallback_text: text.clone(),
                        };
                        if whisper_audio_truncated || !submit_whisper_job(&whisper_tx, whisper_job)
                        {
                            let _ = app.emit(
                                "bible-speech-transcript",
                                SpeechEvent {
                                    text,
                                    final_segment: true,
                                    authoritative: true,
                                    engine: "sherpa-onnx",
                                    alternatives: Vec::new(),
                                },
                            );
                        }
                    }
                }
            }
            break;
        }
        match audio_rx.recv_timeout(Duration::from_millis(100)) {
            Ok(chunk) => {
                if engine == "combined" {
                    append_utterance_audio(
                        &mut utterance_samples,
                        &mut whisper_audio_truncated,
                        &chunk,
                        sample_rate,
                    );
                }
                samples.extend(chunk);
            }
            Err(mpsc::RecvTimeoutError::Timeout) => continue,
            Err(mpsc::RecvTimeoutError::Disconnected) => {
                return Err("Microphone audio stream ended unexpectedly.".into());
            }
        }
        while samples.len() >= CHUNK_SAMPLES {
            let chunk: Vec<f32> = samples.drain(..CHUNK_SAMPLES).collect();
            stream.accept_waveform(sample_rate, &chunk);
            while recognizer.is_ready(&stream) {
                recognizer.decode(&stream);
                if let Some(result) = recognizer.get_result(&stream) {
                    let text = result.text.trim().to_string();
                    if !text.is_empty() && text != last_hypothesis {
                        let _ = app.emit(
                            "bible-speech-transcript",
                            SpeechEvent {
                                text: text.clone(),
                                final_segment: false,
                                authoritative: false,
                                engine: "sherpa-onnx",
                                alternatives: Vec::new(),
                            },
                        );
                        last_hypothesis = text.clone();
                    }
                    if recognizer.is_endpoint(&stream) {
                        if !text.is_empty() {
                            let _ = app.emit(
                                "bible-speech-transcript",
                                SpeechEvent {
                                    text: text.clone(),
                                    final_segment: true,
                                    authoritative: engine == "streaming",
                                    engine: "sherpa-onnx",
                                    alternatives: Vec::new(),
                                },
                            );
                            if engine == "combined" {
                                let whisper_job = WhisperJob {
                                    samples: std::mem::take(&mut utterance_samples),
                                    sample_rate,
                                    fallback_text: text.clone(),
                                };
                                if whisper_audio_truncated
                                    || !submit_whisper_job(&whisper_tx, whisper_job)
                                {
                                    let _ = app.emit(
                                        "bible-speech-transcript",
                                        SpeechEvent {
                                            text,
                                            final_segment: true,
                                            authoritative: true,
                                            engine: "sherpa-onnx",
                                            alternatives: Vec::new(),
                                        },
                                    );
                                }
                                whisper_audio_truncated = false;
                            }
                        }
                        recognizer.reset(&stream);
                        last_hypothesis.clear();
                    }
                }
            }
        }
    }
    Ok(())
}

fn start_whisper_worker(
    app: tauri::AppHandle,
    model_dir: PathBuf,
    language: String,
) -> Result<mpsc::SyncSender<WhisperJob>, String> {
    let (encoder, decoder, tokens, model_name, model_language) = if language == "auto" {
        (
            model_dir.join("tiny-encoder.int8.onnx"),
            model_dir.join("tiny-decoder.int8.onnx"),
            model_dir.join("tiny-tokens.txt"),
            "multilingual",
            String::new(),
        )
    } else {
        (
            model_dir.join("tiny.en-encoder.int8.onnx"),
            model_dir.join("tiny.en-decoder.int8.onnx"),
            model_dir.join("tiny.en-tokens.txt"),
            "English",
            "en".to_string(),
        )
    };
    if !encoder.is_file() || !decoder.is_file() || !tokens.is_file() {
        return Err(format!(
            "The {model_name} Whisper model is missing. Rebuild BibleShow while online to prepare the bundled model."
        ));
    }
    let mut config = OfflineRecognizerConfig::default();
    config.model_config.whisper = OfflineWhisperModelConfig {
        encoder: Some(encoder.to_string_lossy().into_owned()),
        decoder: Some(decoder.to_string_lossy().into_owned()),
        language: Some(model_language),
        task: Some("transcribe".into()),
        tail_paddings: 0,
        enable_token_timestamps: false,
        enable_segment_timestamps: false,
    };
    config.model_config.tokens = Some(tokens.to_string_lossy().into_owned());
    config.model_config.provider = Some("cpu".into());
    config.model_config.num_threads = 2;
    let recognizer = OfflineRecognizer::create(&config).ok_or_else(|| {
        format!("The bundled {model_name} Whisper recognizer could not be initialized.")
    })?;
    let (tx, rx) = mpsc::sync_channel::<WhisperJob>(2);
    thread::Builder::new()
        .name("bibleshow-whisper-final-pass".into())
        .spawn(move || {
            while let Ok(job) = rx.recv() {
                let normalized = resample_mono(&job.samples, job.sample_rate, 16_000);
                if normalized.is_empty() {
                    let _ = app.emit(
                        "bible-speech-transcript",
                        SpeechEvent {
                            text: job.fallback_text,
                            final_segment: true,
                            authoritative: true,
                            engine: "sherpa-onnx",
                            alternatives: Vec::new(),
                        },
                    );
                    continue;
                }
                let stream = recognizer.create_stream();
                stream.accept_waveform(16_000, &normalized);
                recognizer.decode(&stream);
                let recognized = stream
                    .get_result()
                    .map(|result| result.text.trim().to_string())
                    .unwrap_or_default();
                let fallback_text = job.fallback_text;
                let alternatives = if !recognized.is_empty()
                    && !fallback_text.trim().is_empty()
                    && !recognized.eq_ignore_ascii_case(fallback_text.trim())
                {
                    vec![fallback_text.clone()]
                } else {
                    Vec::new()
                };
                let (text, engine) = if recognized.is_empty() {
                    (fallback_text, "sherpa-onnx")
                } else {
                    (recognized, "whisper")
                };
                if !text.is_empty() {
                    let _ = app.emit(
                        "bible-speech-transcript",
                        SpeechEvent {
                            text,
                            final_segment: true,
                            authoritative: true,
                            engine,
                            alternatives,
                        },
                    );
                }
            }
        })
        .map_err(|error| format!("Could not start the local Whisper worker: {error}"))?;
    Ok(tx)
}

fn submit_whisper_job(sender: &Option<mpsc::SyncSender<WhisperJob>>, job: WhisperJob) -> bool {
    sender
        .as_ref()
        .is_some_and(|sender| sender.try_send(job).is_ok())
}

fn append_utterance_audio(
    samples: &mut Vec<f32>,
    truncated: &mut bool,
    chunk: &[f32],
    sample_rate: i32,
) {
    if *truncated {
        return;
    }
    let limit = sample_rate.max(1) as usize * WHISPER_MAX_UTTERANCE_SECONDS;
    if samples.len().saturating_add(chunk.len()) > limit {
        samples.clear();
        *truncated = true;
    } else {
        samples.extend_from_slice(chunk);
    }
}

fn resample_mono(samples: &[f32], source_rate: i32, target_rate: i32) -> Vec<f32> {
    if samples.is_empty() || source_rate <= 0 || target_rate <= 0 {
        return Vec::new();
    }
    if source_rate == target_rate {
        return samples.to_vec();
    }
    LinearResampler::create(source_rate, target_rate)
        .map(|resampler| resampler.resample(samples, true))
        .unwrap_or_default()
}

fn build_audio_stream(
    device: &cpal::Device,
    config: &cpal::SupportedStreamConfig,
    channels: usize,
    tx: mpsc::SyncSender<Vec<f32>>,
) -> Result<cpal::Stream, String> {
    let sample_format = config.sample_format();
    let config = config.config();
    let error_callback = |error| log::warn!("Microphone stream error: {error}");
    match sample_format {
        SampleFormat::F32 => device.build_input_stream(
            &config,
            move |data: &[f32], _| send_mono(data, channels, |sample| sample, &tx),
            error_callback,
            Some(Duration::from_secs(1)),
        ),
        SampleFormat::I16 => device.build_input_stream(
            &config,
            move |data: &[i16], _| send_mono(data, channels, |sample| sample as f32 / 32768.0, &tx),
            error_callback,
            Some(Duration::from_secs(1)),
        ),
        SampleFormat::U16 => device.build_input_stream(
            &config,
            move |data: &[u16], _| {
                send_mono(
                    data,
                    channels,
                    |sample| (sample as f32 - 32768.0) / 32768.0,
                    &tx,
                )
            },
            error_callback,
            Some(Duration::from_secs(1)),
        ),
        format => return Err(format!("Unsupported microphone audio format: {format:?}")),
    }
    .map_err(|error| format!("Could not create the microphone stream: {error}"))
}

fn send_mono<T: Copy>(
    data: &[T],
    channels: usize,
    convert: impl Fn(T) -> f32,
    tx: &mpsc::SyncSender<Vec<f32>>,
) {
    let mono = data
        .chunks_exact(channels)
        .map(|frame| frame.iter().copied().map(&convert).sum::<f32>() / channels as f32)
        .collect::<Vec<_>>();
    if !mono.is_empty() {
        let _ = tx.try_send(mono);
    }
}
