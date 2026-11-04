; Compiles the exact production report dialog without installing software or launching init.
#ifndef Version
  #define Version "0.0.0-test"
#endif
[Setup]
AppId=PromptbookInstallerReportFixture
AppName=Promptbook installer report fixture
AppVersion={#Version}
DefaultDirName={tmp}\ptbk-report-fixture
CreateAppDir=no
Uninstallable=no
PrivilegesRequired=lowest
OutputDir=..\..\dist-installer-test
OutputBaseFilename=report-dialog-fixture
WizardStyle=modern

[Code]
var
  ResultFilePath, PreparationStage, LastFailure: String;

#include "..\..\installer\windows\report-dialog.iss"
#include "..\..\installer\windows\command-line.iss"

procedure ExitProcess(Code: Cardinal);
  external 'ExitProcess@kernel32.dll stdcall';

procedure InitializeWizard;
var
  Work: String;
  Decisions, Root, Destination, Params: String;
  Code: Integer;
begin
  Work := ExpandConstant('{param:FixtureRoot|}');
  Root := AddBackslash(Work) + 'quoted\nested\root\';
  Destination := AddBackslash(Work) + 'quoted-destination.ini';
  Params := '-NoProfile -NonInteractive -ExecutionPolicy Bypass -File ' + Quoted(ExpandConstant('{param:Bootstrap|}')) +
    ' -PromptbookVersion 0.0.0-test -ValidateProjectsOnly -ProjectsRoot ' + Quoted(Root) +
    ' -ProjectName ' + Quoted('first & project''s') + ' -DetectionFile ' + Quoted(Destination);
  if not Exec(ExpandConstant('{sys}\WindowsPowerShell\v1.0\powershell.exe'), Params, '', SW_HIDE, ewWaitUntilTerminated, Code) or (Code <> 0) then
    RaiseException('The production Windows argv quoting did not preserve a trailing backslash.');
  if GetIniString('Destination', 'Root', '', Destination) <> Root then
    RaiseException('The quoted root changed before preflight.');
  if GetIniString('Destination', 'Target', '', Destination) <> Root + 'first & project''s' then
    RaiseException('The quoted project name changed before preflight.');
  ResultFilePath := AddBackslash(Work) + 'result.ini';
  PreparationStage := 'Projects folder';
  Decisions := IntToStr(ShowFailure('The selected projects folder cannot be prepared.', 'Retry', True));
  Decisions := Decisions + ',' + IntToStr(ShowFailure('Review the installed version before replacing it.', 'Replace', False));
  ResultFilePath := '';
  Decisions := Decisions + ',' + IntToStr(ShowFailure('Windows PowerShell could not be started.', 'Retry', False));
  SaveStringToFile(AddBackslash(Work) + 'decisions.txt', Decisions, False);
  ExitProcess(0);
end;
