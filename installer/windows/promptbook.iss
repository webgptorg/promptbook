; Promptbook Windows installer: a thin, double-clickable bootstrap around bootstrap.ps1.
;
; Built automatically by the "Publish ptbk" workflow from the same release tag as the npm package:
;   iscc /DVersion=0.119.0-22 /DNumericVersion=0.119.0.22 installer\windows\promptbook.iss
; It installs only the bootstrap script per user (no administrator rights of its own), asks for the projects folder
; and the first project's folder name, then runs the bootstrap, which installs missing prerequisites (Windows asks
; for permission when a prerequisite needs it), the exact ptbk version, and opens a terminal running `ptbk init`.

#ifndef Version
  #error Pass the release version: iscc /DVersion=<version> /DNumericVersion=<a.b.c.d> promptbook.iss
#endif
#ifndef NumericVersion
  #define NumericVersion "0.0.0.0"
#endif

[Setup]
AppId={{6B2E5E61-3C7F-4D7B-9E59-5F0B7A1C2D41}
AppName=Promptbook
AppVersion={#Version}
AppVerName=Promptbook {#Version}
AppPublisher=Promptbook
AppPublisherURL=https://ptbk.io/
AppSupportURL=https://github.com/webgptorg/promptbook
; Binary version resources must be numeric (a.b.c.d); the release version text goes into the *TextVersion fields.
VersionInfoVersion={#NumericVersion}
VersionInfoProductVersion={#NumericVersion}
VersionInfoTextVersion={#Version}
VersionInfoProductTextVersion={#Version}
VersionInfoDescription=Promptbook {#Version} installer (engine, desktop and optional harnesses)
DefaultDirName={localappdata}\Promptbook\Installer
DisableDirPage=yes
DisableProgramGroupPage=yes
DisableReadyPage=no
PrivilegesRequired=lowest
ArchitecturesAllowed=x64compatible
ArchitecturesInstallIn64BitMode=x64compatible
OutputDir=..\..\dist-installer
OutputBaseFilename=Promptbook-Setup-{#Version}-windows-x64
Compression=lzma2
SolidCompression=yes
WizardStyle=modern
SetupIconFile=promptbook.ico
WizardImageFile=wizard.bmp
WizardSmallImageFile=wizard-small.bmp
LicenseFile=..\..\LICENSE.md
SetupLogging=yes
UninstallDisplayName=Promptbook installer {#Version} (your projects and tools are kept)

[Messages]
WelcomeLabel2=This prepares your computer for Promptbook {#Version}:%n%n- prepares compatible Node.js, npm and Git automatically,%n- installs the Promptbook engine and command-line tool,%n- optionally installs the local desktop controller, Codex and Claude Code.%n%nThe desktop controller is selected by default. The same project setup assistant works in the app or in a terminal.

[Types]
Name: "full"; Description: "Promptbook with desktop, Codex and Claude Code"
Name: "cli"; Description: "Engine and command-line tool only"
Name: "custom"; Description: "Choose components"; Flags: iscustom

[Components]
Name: "core"; Description: "Promptbook engine and CLI"; Types: full cli custom; Flags: fixed
Name: "desktop"; Description: "Local desktop application and tray controller"; Types: full custom
Name: "codex"; Description: "OpenAI Codex CLI (install if missing)"; Types: full custom
Name: "claude"; Description: "Claude Code CLI (install if missing)"; Types: full custom

[Files]
Source: "bootstrap.ps1"; DestDir: "{app}"; Flags: ignoreversion
Source: "promptbook.ico"; DestDir: "{app}"; Flags: ignoreversion
Source: "..\..\apps\desktop\release\win-unpacked\*"; DestDir: "{app}\desktop"; Components: desktop; Flags: ignoreversion recursesubdirs createallsubdirs

[Icons]
Name: "{userprograms}\Promptbook\Promptbook"; Filename: "{app}\desktop\promptbook.exe"; Components: desktop

[Registry]
Root: HKCU; Subkey: "Software\Microsoft\Windows\CurrentVersion\Run"; ValueType: string; ValueName: "PromptbookDesktop"; ValueData: """{app}\desktop\promptbook.exe"" --tray"; Components: desktop; Flags: uninsdeletevalue

[UninstallRun]
Filename: "{app}\desktop\promptbook.exe"; Parameters: "--quit-client"; RunOnceId: "CloseDesktopClient"; Flags: runhidden skipifdoesntexist

[Code]
var
  BootstrapSucceeded: Boolean;
  RootPage: TInputDirWizardPage;
  ProjectPage: TInputQueryWizardPage;
  SkipBox: TNewCheckBox;

function IsValidFolderName(Name: String): Boolean;
var
  I: Integer;
  Upper: String;
begin
  Result := (Length(Name) > 0) and (Trim(Name) = Name) and (Name[Length(Name)] <> '.') and (Name <> '.') and (Name <> '..');
  for I := 1 to Length(Name) do
    if Pos(Copy(Name, I, 1), '\/:*?"<>|') > 0 then Result := False;
  Upper := Uppercase(Name);
  if (Upper = 'CON') or (Upper = 'PRN') or (Upper = 'AUX') or (Upper = 'NUL') then Result := False;
  if (Length(Upper) = 4) and ((Copy(Upper, 1, 3) = 'COM') or (Copy(Upper, 1, 3) = 'LPT')) and (Upper[4] >= '1') and (Upper[4] <= '9') then Result := False;
end;

function IsDirectoryEmpty(Path: String): Boolean;
var
  FindRec: TFindRec;
begin
  Result := True;
  if FindFirst(AddBackslash(Path) + '*', FindRec) then
  begin
    try
      repeat
        if (FindRec.Name <> '.') and (FindRec.Name <> '..') then
        begin
          Result := False;
          Break;
        end;
      until not FindNext(FindRec);
    finally
      FindClose(FindRec);
    end;
  end;
end;

procedure InitializeWizard;
begin
  RootPage := CreateInputDirPage(wpSelectComponents, 'Projects folder', 'Where should your Promptbook projects live?',
    'Promptbook keeps each project in its own folder inside this one. It is an ordinary folder, not a project itself.', False, '');
  RootPage.Add('');
  RootPage.Values[0] := ExpandConstant('{%USERPROFILE}\ptbk\project');

  ProjectPage := CreateInputQueryPage(RootPage.ID, 'First project', 'Create your first project',
    'An empty folder is created for it. The setup assistant (ptbk init) then asks what you are working on; the folder name is only a name.');
  ProjectPage.Add('Project folder name:', False);
  ProjectPage.Values[0] := 'my-first-project';
  SkipBox := TNewCheckBox.Create(ProjectPage);
  SkipBox.Parent := ProjectPage.Surface;
  SkipBox.Top := ProjectPage.Edits[0].Top + ProjectPage.Edits[0].Height + ScaleY(16);
  SkipBox.Width := ProjectPage.SurfaceWidth;
  SkipBox.Caption := 'Skip: only install Promptbook, do not create a project now';
end;

function NextButtonClick(CurPageID: Integer): Boolean;
var
  Target: String;
begin
  Result := True;
  if (CurPageID = ProjectPage.ID) and not SkipBox.Checked then
  begin
    if not IsValidFolderName(ProjectPage.Values[0]) then
    begin
      MsgBox('Please enter a valid folder name (no \ / : * ? " < > | and no reserved names such as CON).', mbError, MB_OK);
      Result := False;
      Exit;
    end;
    Target := AddBackslash(RootPage.Values[0]) + ProjectPage.Values[0];
    if DirExists(Target) and not IsDirectoryEmpty(Target) then
    begin
      MsgBox('The folder ' + Target + ' already exists and is not empty. Nothing in it is changed; please choose another name.', mbError, MB_OK);
      Result := False;
    end;
  end;
end;

function Quoted(Value: String): String;
begin
  Result := '"' + Value + '"';
end;

function RunBootstrap(AllowReplacement: Boolean; var Code: Integer): Boolean;
var
  Params: String;
begin
  Params := '-NoProfile -ExecutionPolicy Bypass -File ' + Quoted(ExpandConstant('{app}\bootstrap.ps1')) +
    ' -PromptbookVersion ' + Quoted('{#Version}') + ' -ProjectsRoot ' + Quoted(RootPage.Values[0]);
  if SkipBox.Checked then Params := Params + ' -SkipProject'
  else Params := Params + ' -ProjectName ' + Quoted(ProjectPage.Values[0]);
  if AllowReplacement then Params := Params + ' -AllowPtbkReplacement';
  if WizardIsComponentSelected('desktop') then Params := Params + ' -DesktopPath ' + Quoted(ExpandConstant('{app}\desktop\promptbook.exe'));
  if WizardIsComponentSelected('codex') then Params := Params + ' -InstallCodex';
  if WizardIsComponentSelected('claude') then Params := Params + ' -InstallClaude';
  { The process-scoped execution policy applies to this one bootstrap script only; no machine policy is changed. }
  Result := Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_SHOW, ewWaitUntilTerminated, Code);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
  AllowReplace: Boolean;
  Done: Boolean;
  LogDirectory: String;
begin
  if CurStep <> ssPostInstall then Exit;
  AllowReplace := False;
  LogDirectory := ExpandConstant('{localappdata}\Promptbook\installer');
  Done := False;
  while not Done do
  begin
    if not RunBootstrap(AllowReplace, Code) then
    begin
      if MsgBox('Windows PowerShell could not be started to prepare Promptbook.', mbError, MB_RETRYCANCEL) = IDCANCEL then Done := True;
      Continue;
    end;
    case Code of
      0: begin BootstrapSucceeded := True; Done := True; end;
      2: begin
           BootstrapSucceeded := True;
           if WizardIsComponentSelected('desktop') then
             MsgBox('Promptbook is installed. No project was created. Use New project in the application whenever you are ready.', mbInformation, MB_OK)
           else
             MsgBox('Promptbook is installed. No project was created; to start one, open a terminal in an empty folder and run: ptbk init', mbInformation, MB_OK);
           Done := True;
         end;
      3: begin
           if (not AllowReplace) and (MsgBox('A decision is needed (see the terminal window): another installed ptbk version was found.' + #13#10#13#10 +
               'If it is another ptbk version: replace the global ptbk with {#Version}? (Project-local installations are never touched.)', mbConfirmation, MB_YESNO) = IDYES) then
             AllowReplace := True
           else
           begin
             MsgBox('Nothing was replaced. Resolve the reported item and run this installer again. Diagnostics: ' + LogDirectory, mbInformation, MB_OK);
             Done := True;
           end;
         end;
    else
      if MsgBox('Promptbook was not fully prepared (stage reported in the terminal window). Your files were kept.' + #13#10 + 'Diagnostics: ' + LogDirectory + #13#10#13#10 + 'Retry now?', mbError, MB_RETRYCANCEL) = IDCANCEL then
        Done := True;
    end;
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  if (CurPageID = wpFinished) and not BootstrapSucceeded then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'Promptbook installation was not completed';
    WizardForm.FinishedLabel.Caption := 'Promptbook is not ready. Run the installer again to retry. Diagnostics: ' + ExpandConstant('{localappdata}\Promptbook\installer');
  end;
end;

function GetCustomSetupExitCode: Integer;
begin
  if BootstrapSucceeded then Result := 0 else Result := 1;
end;
