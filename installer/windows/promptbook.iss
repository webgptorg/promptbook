; Promptbook Windows installer: a thin, double-clickable bootstrap around bootstrap.ps1.
;
; Built automatically by the "Publish ptbk" workflow from the same release tag as the npm package:
;   iscc /DVersion=0.119.0-22 /DNumericVersion=0.119.0.22 installer\windows\promptbook.iss
; Installs the exact ptbk version and required software, then opens the optional desktop client.

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
VersionInfoDescription=Promptbook {#Version} installer (engine and optional desktop)
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
WelcomeLabel2=This prepares your computer for Promptbook {#Version}:%n%n- checks Node.js, npm and Git and prepares the required missing software,%n- installs the Promptbook engine and command-line tool,%n- optionally installs the local desktop controller.%n%nThe desktop controller is selected by default. Choose your AI tools later in the project setup assistant.

[Types]
Name: "full"; Description: "Promptbook with desktop"
Name: "cli"; Description: "Engine and command-line tool only"
Name: "custom"; Description: "Choose components"; Flags: iscustom

[Components]
Name: "core"; Description: "Promptbook engine and CLI"; Types: full cli custom; Flags: fixed
Name: "desktop"; Description: "Local desktop application and tray controller"; Types: full custom

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
  PrerequisitesPage: TOutputMsgWizardPage;
  PreparationPage: TOutputMarqueeProgressWizardPage;
  PreparationStage: String;
  PreparationOutput: String;
  ResultFilePath: String;
  LastFailure: String;
  FinishedReportButton: TNewButton;


#include "report-dialog.iss"

#include "command-line.iss"

{ All preparation output stays in Setup, including when PowerShell fails unexpectedly. }
procedure PreparationLog(const S: String; const Error, FirstLine: Boolean);
var
  Separator: Integer;
begin
  Log(S);
  if Trim(S) = '' then Exit;
  PreparationOutput := PreparationOutput + S + #13#10;
  if Length(PreparationOutput) > 3000 then
    PreparationOutput := Copy(PreparationOutput, Length(PreparationOutput) - 2999, 3000);
  Separator := Pos('] ', S);
  if (Copy(S, 1, 1) = '[') and (Separator > 0) then
  begin
    PreparationStage := Copy(S, Separator + 2, Length(S));
    PreparationPage.SetText(PreparationStage, 'Please wait...');
  end
  else if Copy(S, 1, 6) = '      ' then
    PreparationPage.SetText(PreparationStage, Trim(S));
end;

function PreparationFailure(DefaultMessage: String): String;
var
  Stage, Message, NextAction, LogFile: String;
begin
  Stage := GetIniString('Result', 'Stage', '', ResultFilePath);
  Message := GetIniString('Result', 'Message', '', ResultFilePath);
  NextAction := GetIniString('Result', 'NextAction', '', ResultFilePath);
  LogFile := GetIniString('Result', 'LogFile', ExpandConstant('{localappdata}\Promptbook\installer'), ResultFilePath);
  if Message = '' then
  begin
    Message := DefaultMessage;
    if PreparationOutput <> '' then Message := Message + #13#10 + PreparationOutput;
  end;
  Result := Message;
  if Stage <> '' then Result := Stage + #13#10 + Result;
  if NextAction <> '' then Result := Result + #13#10#13#10 + NextAction;
  Result := Result + #13#10#13#10 + 'Diagnostics: ' + LogFile;
end;

function RunPreparation(ScriptPath, ExtraParams: String; var Code: Integer): Boolean;
var
  Params: String;
begin
  Code := -1;
  Result := False;
  ResultFilePath := ExpandConstant('{tmp}\promptbook-result.ini');
  DeleteFile(ResultFilePath);
  PreparationOutput := '';
  PreparationStage := 'Checking and preparing required software';
  Params := '-NoLogo -NoProfile -NonInteractive -OutputFormat Text -ExecutionPolicy Bypass -File ' + Quoted(ScriptPath) +
    ' -PromptbookVersion ' + Quoted('{#Version}') + ' -ResultFile ' + Quoted(ResultFilePath) + ExtraParams;
  PreparationPage.SetText(PreparationStage, 'Please wait...');
  PreparationPage.Show;
  PreparationPage.Animate;
  try
    try
      { ExecAndLogOutput always hides console processes and streams their output to Setup. }
      Result := ExecAndLogOutput(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_SHOWNORMAL,
        ewWaitUntilTerminated, Code, @PreparationLog);
    except
      PreparationOutput := GetExceptionMessage;
      Log(PreparationOutput);
    end;
  finally
    PreparationPage.Hide;
  end;
end;

function DetectPrerequisites: Boolean;
var
  Code: Integer;
  DetectionFile, Available, Required: String;
begin
  Result := False;
  ExtractTemporaryFile('bootstrap.ps1');
  DetectionFile := ExpandConstant('{tmp}\promptbook-prerequisites.ini');
  DeleteFile(DetectionFile);
  if not RunPreparation(ExpandConstant('{tmp}\bootstrap.ps1'), ' -SkipProject -DetectOnly -DetectionFile ' + Quoted(DetectionFile), Code) or
    (Code <> 0) or not FileExists(DetectionFile) then
  begin
    ShowFailure(PreparationFailure('Required software could not be checked. Click Next to retry.'), 'Back', False);
    Exit;
  end;
  Available := '';
  Required := '';
  if GetIniInt('Prerequisites', 'NodeReady', 0, 0, 1, DetectionFile) = 1 then
    Available := 'Node.js ' + GetIniString('Prerequisites', 'NodeVersion', '', DetectionFile) +
      ' and npm ' + GetIniString('Prerequisites', 'NpmVersion', '', DetectionFile) + #13#10
  else
    Required := 'Node.js with npm (required)' + #13#10;
  if GetIniInt('Prerequisites', 'GitReady', 0, 0, 1, DetectionFile) = 1 then
    Available := Available + 'Git ' + GetIniString('Prerequisites', 'GitVersion', '', DetectionFile) + #13#10
  else if GetIniInt('Prerequisites', 'GitNeedsRepair', 0, 0, 1, DetectionFile) = 1 then
  begin
    ShowFailure('Git is installed but does not run. Repair Git, then click Next to check again.', 'Back', False);
    Exit;
  end
  else Required := Required + 'Git (required)' + #13#10;
  PrerequisitesPage.MsgLabel.Caption := '';
  if Available <> '' then PrerequisitesPage.MsgLabel.Caption := 'Already installed and ready:' + #13#10 + Available + #13#10;
  if Required <> '' then
    PrerequisitesPage.MsgLabel.Caption := PrerequisitesPage.MsgLabel.Caption + 'Will be installed:' + #13#10 + Required + #13#10 +
      'These are required for Promptbook and will be prepared automatically when you click Install.'
  else
    PrerequisitesPage.MsgLabel.Caption := PrerequisitesPage.MsgLabel.Caption + 'All required software is ready.';
  Result := True;
end;

procedure InitializeWizard;
begin
  FinishedReportButton := TNewButton.Create(WizardForm);
  FinishedReportButton.Parent := WizardForm;
  FinishedReportButton.SetBounds(ScaleX(16), WizardForm.NextButton.Top, ScaleX(120), WizardForm.NextButton.Height);
  FinishedReportButton.Caption := 'View report';
  FinishedReportButton.OnClick := @FinishedReportClick;
  FinishedReportButton.Visible := False;
  PreparationPage := CreateOutputMarqueeProgressPage('Preparing Promptbook', 'Required software and installation progress');
  PrerequisitesPage := CreateOutputMsgPage(wpSelectComponents, 'Required software', 'Checked on this computer', '');
end;

function NextButtonClick(CurPageID: Integer): Boolean;
begin
  Result := True;
  if CurPageID = wpSelectComponents then Result := DetectPrerequisites;
end;

function RunBootstrap(AllowReplacement: Boolean; var Code: Integer): Boolean;
var
  Params: String;
begin
  Params := ' -SkipProject';
  if AllowReplacement then Params := Params + ' -AllowPtbkReplacement';
  if ExpandConstant('{param:PrepareOnly|no}') = 'yes' then Params := Params + ' -NoLaunch';
  if WizardIsComponentSelected('desktop') then Params := Params + ' -DesktopPath ' + Quoted(ExpandConstant('{app}\desktop\promptbook.exe'));
  { The process-scoped execution policy applies to this one bootstrap script only; no machine policy is changed. }
  Result := RunPreparation(ExpandConstant('{app}\bootstrap.ps1'), Params, Code);
end;

procedure CurStepChanged(CurStep: TSetupStep);
var
  Code: Integer;
  AllowReplace: Boolean;
  Done: Boolean;
begin
  if CurStep <> ssPostInstall then Exit;
  AllowReplace := False;
  Done := False;
  while not Done do
  begin
    if not RunBootstrap(AllowReplace, Code) then
    begin
      LastFailure := PreparationFailure('Windows PowerShell could not be started to prepare Promptbook.');
      Done := ShowFailure(LastFailure, 'Retry', False) <> mrOk;
      Continue;
    end;
    case Code of
      0, 2: begin BootstrapSucceeded := True; Done := True; end;
      3: begin
           LastFailure := PreparationFailure('Another installed ptbk version was found.');
           if (not AllowReplace) and (GetIniString('Result', 'Stage', '', ResultFilePath) = 'ptbk version') and
             (ShowFailure(LastFailure + #13#10#13#10 + 'Replace the global ptbk with {#Version}? Project-local installations are never touched.', 'Replace', False) = mrOk) then
             AllowReplace := True
           else Done := True;
         end;
    else
      begin
        LastFailure := PreparationFailure('Promptbook was not fully prepared. Your files were kept.');
        Done := ShowFailure(LastFailure, 'Retry', False) <> mrOk;
      end;
    end;
  end;
end;

procedure CurPageChanged(CurPageID: Integer);
begin
  FinishedReportButton.Visible := (CurPageID = wpFinished) and not BootstrapSucceeded;
  if (CurPageID = wpFinished) and not BootstrapSucceeded then
  begin
    WizardForm.FinishedHeadingLabel.Caption := 'Promptbook installation was not completed';
    WizardForm.FinishedLabel.Caption := LastFailure;
  end
  else if CurPageID = wpFinished then
  begin
    if WizardIsComponentSelected('desktop') then
      WizardForm.FinishedLabel.Caption := 'Promptbook is installed. Open the application to create or manage your projects.'
    else
      WizardForm.FinishedLabel.Caption := 'Promptbook is installed. Open Promptbook terminal from the Start menu and run ptbk init when you are ready to create a project.';
  end;
end;

function GetCustomSetupExitCode: Integer;
begin
  if BootstrapSucceeded then Result := 0 else Result := 1;
end;
