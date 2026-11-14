use std::{
    path::{Path, PathBuf},
    sync::Mutex,
    thread,
    time::{Duration, Instant},
};

use serde::Serialize;
use tauri::AppHandle;

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PowerPointSessionInfo {
    pub file_id: String,
    pub slide_count: usize,
    pub slide_thumbnails: Vec<String>,
}

pub struct PowerPointState {
    active: Mutex<Option<ActiveSession>>,
}

impl Default for PowerPointState {
    fn default() -> Self {
        Self {
            active: Mutex::new(None),
        }
    }
}

struct ActiveSession {
    file_id: String,
    file_path: PathBuf,
    info: PowerPointSessionInfo,
}

impl Drop for ActiveSession {
    fn drop(&mut self) {
        let _ = run_powerpoint_action("stop", &self.file_path, 1, None);
    }
}

impl PowerPointState {
    pub fn active_session(&self) -> Result<Option<PowerPointSessionInfo>, String> {
        self.active
            .lock()
            .map(|session| session.as_ref().map(|active| active.info.clone()))
            .map_err(|_| "PowerPoint output state is unavailable.".to_string())
    }
}

pub fn start(
    app: &AppHandle,
    state: &PowerPointState,
    file_id: String,
    file_path: PathBuf,
    preview_root: PathBuf,
) -> Result<PowerPointSessionInfo, String> {
    #[cfg(not(target_os = "windows"))]
    {
        let _ = (app, state, file_id, file_path, preview_root);
        Err("PowerPoint slide previews require Microsoft PowerPoint on Windows.".into())
    }

    #[cfg(target_os = "windows")]
    {
        use tauri::Manager;

        let mut active = state
            .active
            .lock()
            .map_err(|_| "PowerPoint output state is unavailable.".to_string())?;
        if let Some(session) = active.as_ref().filter(|session| session.file_id == file_id) {
            return Ok(session.info.clone());
        }
        let previous = active.take();
        drop(active);
        drop(previous);

        let thumbnail_directory = thumbnail_file_path(&preview_root, &file_id, 1)
            .parent()
            .expect("thumbnail path has a parent")
            .to_path_buf();
        let output = run_powerpoint_action("start", &file_path, 1, Some(&thumbnail_directory))?;
        let slide_count = output
            .get("slideCount")
            .and_then(serde_json::Value::as_u64)
            .filter(|count| *count > 0 && *count <= 10_000)
            .ok_or_else(|| "PowerPoint did not report a usable slide count.".to_string())?
            as usize;
        let slide_thumbnails = (1..=slide_count)
            .map(|page| thumbnail_file_path(&preview_root, &file_id, page))
            .collect::<Vec<_>>();
        if slide_thumbnails.iter().any(|path| !path.is_file()) {
            let _ = run_powerpoint_action("stop", &file_path, 1, None);
            return Err("PowerPoint opened, but BibleShow could not prepare every slide preview.".into());
        }
        let _ = app.get_webview_window("main").map(|window| window.set_focus());
        let info = PowerPointSessionInfo {
            file_id: file_id.clone(),
            slide_count,
            slide_thumbnails: slide_thumbnails
                .iter()
                .map(|path| path.to_string_lossy().into_owned())
                .collect(),
        };
        let session = ActiveSession {
            file_id,
            file_path,
            info: info.clone(),
        };
        let mut active = state
            .active
            .lock()
            .map_err(|_| "PowerPoint output state is unavailable.".to_string())?;
        *active = Some(session);
        Ok(info)
    }
}

pub fn export_slide_preview(
    state: &PowerPointState,
    file_id: &str,
    page: usize,
    preview_root: &Path,
) -> Result<String, String> {
    if page == 0 || page > 10_000 {
        return Err("Choose a valid PowerPoint slide number.".into());
    }
    let file_path = {
        let active = state
            .active
            .lock()
            .map_err(|_| "PowerPoint output state is unavailable.".to_string())?;
        active
            .as_ref()
            .filter(|session| session.file_id == file_id)
            .ok_or_else(|| "Start this PowerPoint file in BibleShow to create its slide preview.".to_string())?
            .file_path
            .clone()
    };
    let path = preview_file_path(preview_root, file_id, page);
    let output = run_powerpoint_action("export", &file_path, page, Some(&path))?;
    if output.get("ok").and_then(serde_json::Value::as_bool) != Some(true) || !path.is_file() {
        return Err("PowerPoint could not export this slide preview.".into());
    }
    Ok(path.to_string_lossy().into_owned())
}

pub fn navigate(state: &PowerPointState, file_id: &str, page: usize) -> Result<(), String> {
    let (file_path, slide_count) = {
        let active = state
            .active
            .lock()
            .map_err(|_| "PowerPoint output state is unavailable.".to_string())?;
        let session = active
            .as_ref()
            .filter(|session| session.file_id == file_id)
            .ok_or_else(|| "Start this PowerPoint file in BibleShow before sending it Live.".to_string())?;
        (session.file_path.clone(), session.info.slide_count)
    };
    if page == 0 || page > slide_count {
        return Err("Choose a valid PowerPoint slide number.".into());
    }
    run_powerpoint_action("goto", &file_path, page, None).map(|_| ())
}

pub fn stop(state: &PowerPointState) -> Result<(), String> {
    let mut active = state
        .active
        .lock()
        .map_err(|_| "PowerPoint output state is unavailable.".to_string())?;
    let session = active.take();
    drop(active);
    drop(session);
    Ok(())
}

pub fn preview_file_path(root: &Path, file_id: &str, page: usize) -> PathBuf {
    let safe_id: String = file_id
        .chars()
        .filter(|character| character.is_ascii_hexdigit())
        .collect();
    root.join("powerpoint-previews")
        .join(safe_id)
        .join(format!("slide-{page}.jpg"))
}

pub fn thumbnail_file_path(root: &Path, file_id: &str, page: usize) -> PathBuf {
    let safe_id: String = file_id
        .chars()
        .filter(|character| character.is_ascii_hexdigit())
        .collect();
    root.join("powerpoint-previews")
        .join(safe_id)
        .join(format!("thumbnail-{page}.png"))
}

#[cfg(target_os = "windows")]
fn run_powerpoint_action(
    action: &str,
    file_path: &Path,
    page: usize,
    output_path: Option<&Path>,
) -> Result<serde_json::Value, String> {
    use std::{
        io::Read,
        os::windows::process::CommandExt,
        process::{Command, Stdio},
    };

    const CREATE_NO_WINDOW: u32 = 0x0800_0000;
    const SCRIPT: &str = r#"
$ErrorActionPreference = 'Stop'
$action = $env:BIBLESHOW_POWERPOINT_ACTION
$path = [IO.Path]::GetFullPath($env:BIBLESHOW_POWERPOINT_PATH)
$page = [int]$env:BIBLESHOW_POWERPOINT_PAGE
$output = $env:BIBLESHOW_POWERPOINT_OUTPUT
function Find-Presentation($application, $presentationPath) {
  $expected = [IO.Path]::GetFullPath($presentationPath)
  foreach ($candidate in @($application.Presentations)) {
    try { if ([IO.Path]::GetFullPath($candidate.FullName) -ieq $expected) { return $candidate } } catch { }
  }
  return $null
}
try {
  if ($action -eq 'start') {
    try { $application = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') }
    catch { $application = New-Object -ComObject PowerPoint.Application }
    $application.Visible = -1
    $presentation = Find-Presentation $application $path
    if ($null -eq $presentation) { $presentation = $application.Presentations.Open($path, -1, 0, -1) }
    $presentation.SlideShowSettings.ShowType = 2
    $show = $null
    foreach ($candidate in @($application.SlideShowWindows)) {
      try { if ([IO.Path]::GetFullPath($candidate.Presentation.FullName) -ieq $path) { $show = $candidate; break } } catch { }
    }
    if ($null -eq $show) { $show = $presentation.SlideShowSettings.Run() }
    $show.View.GotoSlide(1)
    try { $show.Left = 100; $show.Top = 70; $show.Width = 960; $show.Height = 540 } catch { }
    [IO.Directory]::CreateDirectory($output) | Out-Null
    $slideCount = [int]$presentation.Slides.Count
    for ($slideNumber = 1; $slideNumber -le $slideCount; $slideNumber++) {
      $thumbnail = Join-Path $output ("thumbnail-{0}.png" -f $slideNumber)
      $presentation.Slides.Item($slideNumber).Export($thumbnail, 'PNG')
    }
    $result = @{ ok = $true; slideCount = $slideCount }
  } else {
    try { $application = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') }
    catch { $application = New-Object -ComObject PowerPoint.Application }
    $presentation = Find-Presentation $application $path
    if ($action -eq 'export') {
      if ($null -eq $presentation) { $presentation = $application.Presentations.Open($path, -1, 0, 0) }
      if ($page -lt 1 -or $page -gt $presentation.Slides.Count) { throw 'The requested slide number is outside this presentation.' }
      $parent = Split-Path -Parent $output
      [IO.Directory]::CreateDirectory($parent) | Out-Null
      $presentation.Slides.Item($page).Export($output, 'JPG', 1920, 1080)
      $result = @{ ok = $true }
    } elseif ($action -eq 'goto') {
      if ($null -eq $presentation) { throw 'This presentation is not open in PowerPoint. Start it again in BibleShow.' }
      if ($page -lt 1 -or $page -gt $presentation.Slides.Count) { throw 'The requested slide number is outside this presentation.' }
      $show = $null
      foreach ($candidate in @($application.SlideShowWindows)) {
        try { if ([IO.Path]::GetFullPath($candidate.Presentation.FullName) -ieq $path) { $show = $candidate; break } } catch { }
      }
      if ($null -eq $show) { throw 'The PowerPoint slideshow window is closed. Start it again in BibleShow.' }
      $show.View.GotoSlide($page)
      $result = @{ ok = $true }
    } elseif ($action -eq 'stop') {
      if ($null -ne $presentation) {
        foreach ($candidate in @($application.SlideShowWindows)) {
          try { if ([IO.Path]::GetFullPath($candidate.Presentation.FullName) -ieq $path) { $candidate.View.Exit(); break } } catch { }
        }
      }
      $result = @{ ok = $true }
    } else { throw 'Unknown PowerPoint action.' }
  }
} catch {
  $result = @{ ok = $false; error = $_.Exception.Message }
}
[Console]::Out.WriteLine(($result | ConvertTo-Json -Compress))
"#;

    let timeout = Duration::from_secs(match action {
        "start" => 180,
        "export" => 20,
        _ => 12,
    });
    let started = Instant::now();
    let mut child = Command::new("powershell.exe")
        .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-Command", SCRIPT])
        .env("BIBLESHOW_POWERPOINT_ACTION", action)
        .env("BIBLESHOW_POWERPOINT_PATH", file_path)
        .env("BIBLESHOW_POWERPOINT_PAGE", page.to_string())
        .env("BIBLESHOW_POWERPOINT_OUTPUT", output_path.unwrap_or(Path::new("")).as_os_str())
        .stdin(Stdio::null())
        .stdout(Stdio::piped())
        .stderr(Stdio::piped())
        .creation_flags(CREATE_NO_WINDOW)
        .spawn()
        .map_err(|error| format!("Could not start PowerPoint automation: {error}"))?;
    loop {
        match child.try_wait() {
            Ok(Some(_)) => break,
            Ok(None) if started.elapsed() < timeout => thread::sleep(Duration::from_millis(50)),
            Ok(None) => {
                let _ = child.kill();
                let _ = child.wait();
                return Err(format!("PowerPoint did not respond to the {action} request within {} seconds.", timeout.as_secs()));
            }
            Err(error) => return Err(format!("Could not wait for PowerPoint automation: {error}")),
        }
    }
    let mut stdout = String::new();
    if let Some(mut pipe) = child.stdout.take() {
        let _ = pipe.read_to_string(&mut stdout);
    }
    let mut stderr = String::new();
    if let Some(mut pipe) = child.stderr.take() {
        let _ = pipe.read_to_string(&mut stderr);
    }
    let response_line = stdout
        .lines()
        .rev()
        .find(|line| line.trim_start().starts_with('{'))
        .ok_or_else(|| {
            format!("PowerPoint did not return a response. {}", stderr.trim())
        })?;
    let response: serde_json::Value = serde_json::from_str(response_line)
        .map_err(|error| format!("PowerPoint returned an unreadable response: {error}"))?;
    if response.get("ok").and_then(serde_json::Value::as_bool) != Some(true) {
        return Err(response
            .get("error")
            .and_then(serde_json::Value::as_str)
            .unwrap_or("PowerPoint could not complete that action.")
            .to_string());
    }
    Ok(response)
}

#[cfg(not(target_os = "windows"))]
fn run_powerpoint_action(
    _action: &str,
    _file_path: &Path,
    _page: usize,
    _output_path: Option<&Path>,
) -> Result<serde_json::Value, String> {
    Err("Embedded PowerPoint control is currently available on Windows with Microsoft PowerPoint installed.".into())
}

#[cfg(all(test, target_os = "windows"))]
mod tests {
    use super::*;
    use std::process::{Command, Stdio};

    fn run_script(script: &str, path: &Path) -> Result<std::process::Output, String> {
        use std::os::windows::process::CommandExt;
        const CREATE_NO_WINDOW: u32 = 0x0800_0000;
        Command::new("powershell.exe")
            .args(["-NoLogo", "-NoProfile", "-NonInteractive", "-STA", "-ExecutionPolicy", "Bypass", "-Command", script])
            .env("BIBLESHOW_TEST_PRESENTATION", path)
            .stdin(Stdio::null())
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .creation_flags(CREATE_NO_WINDOW)
            .output()
            .map_err(|error| format!("Could not run the isolated PowerPoint test: {error}"))
    }

    #[test]
    #[ignore = "requires an interactive Windows logon session and Microsoft PowerPoint"]
    fn powerpoint_exports_slides_for_bibleshow_preview_and_live() {
        let probe = run_script(
            "if (Get-Process POWERPNT -ErrorAction SilentlyContinue) { exit 9 }",
            Path::new("unused"),
        )
        .expect("PowerPoint process check should run");
        if !probe.status.success() {
            eprintln!("Skipping PowerPoint slide-preview smoke test because PowerPoint is already open.");
            return;
        }

        let suffix = std::process::id();
        let deck_path = std::env::temp_dir().join(format!("bibleshow-ppt-smoke-{suffix}.pptx"));
        let preview_root = std::env::temp_dir().join(format!("bibleshow-ppt-smoke-cache-{suffix}"));
        let thumbnail_directory = thumbnail_file_path(&preview_root, "bibleshow-test", 1)
            .parent()
            .unwrap()
            .to_path_buf();
        let create_script = r#"
$ErrorActionPreference = 'Stop'
$application = New-Object -ComObject PowerPoint.Application
$application.Visible = -1
$presentation = $application.Presentations.Add()
foreach ($item in @(@{index=1;color=255;text='BibleShow preview test — slide one'}, @{index=2;color=16711680;text='BibleShow preview test — slide two'})) {
  $slide = $presentation.Slides.Add([int]$item.index, 12)
  $slide.FollowMasterBackground = 0
  $slide.Background.Fill.Solid()
  $slide.Background.Fill.ForeColor.RGB = [int]$item.color
  $shape = $slide.Shapes.AddShape(1, 70, 80, 1100, 450)
  $shape.Fill.Visible = 0
  $shape.Line.Visible = 0
  $shape.TextFrame.TextRange.Text = [string]$item.text
  $shape.TextFrame.TextRange.Font.Size = 42
  $shape.TextFrame.TextRange.Font.Color.RGB = 16777215
}
$presentation.SaveAs($env:BIBLESHOW_TEST_PRESENTATION, 24)
$presentation.Close()
$application.Quit()
"created"
"#;
        let cleanup_script = r#"
$ErrorActionPreference = 'Stop'
try { $application = [Runtime.InteropServices.Marshal]::GetActiveObject('PowerPoint.Application') }
catch { exit 0 }
$expected = [IO.Path]::GetFullPath($env:BIBLESHOW_TEST_PRESENTATION)
foreach ($presentation in @($application.Presentations)) {
  try { if ([IO.Path]::GetFullPath($presentation.FullName) -ieq $expected) { $presentation.Close() } } catch { }
}
if ($application.Presentations.Count -eq 0) { $application.Quit() }
"cleaned"
"#;

        let result = (|| -> Result<(), String> {
            let created = run_script(create_script, &deck_path)?;
            if !created.status.success() || !deck_path.is_file() {
                return Err(format!(
                    "Could not create the temporary PowerPoint deck: {}",
                    String::from_utf8_lossy(&created.stderr)
                ));
            }
            let started = run_powerpoint_action("start", &deck_path, 1, Some(&thumbnail_directory))?;
            assert_eq!(started["slideCount"].as_u64(), Some(2));
            for page in 1..=2 {
                let thumbnail = thumbnail_file_path(&preview_root, "bibleshow-test", page);
                assert!(thumbnail.metadata().map(|meta| meta.len() > 0).unwrap_or(false));
            }
            run_powerpoint_action("goto", &deck_path, 2, None)?;
            let preview = preview_file_path(&preview_root, "bibleshow-test", 2);
            run_powerpoint_action("export", &deck_path, 2, Some(&preview))?;
            assert!(preview.metadata().map(|meta| meta.len() > 0).unwrap_or(false));
            run_powerpoint_action("stop", &deck_path, 1, None)?;
            Ok(())
        })();

        let _ = run_powerpoint_action("stop", &deck_path, 1, None);
        let _ = run_script(cleanup_script, &deck_path);
        let _ = std::fs::remove_file(&deck_path);
        let _ = std::fs::remove_dir_all(&preview_root);
        result.expect("PowerPoint should export its slides and follow BibleShow navigation");
    }
}
