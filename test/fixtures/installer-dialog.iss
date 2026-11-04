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

function InitializeSetup: Boolean;
var
  Work: String;
  Decisions: String;
begin
  Work := ExpandConstant('{param:FixtureRoot|}');
  ResultFilePath := AddBackslash(Work) + 'result.ini';
  PreparationStage := 'Projects folder';
  Decisions := IntToStr(ShowFailure('The selected projects folder cannot be prepared.', 'Retry', True));
  Decisions := Decisions + ',' + IntToStr(ShowFailure('Review the installed version before replacing it.', 'Replace', False));
  ResultFilePath := '';
  Decisions := Decisions + ',' + IntToStr(ShowFailure('Windows PowerShell could not be started.', 'Retry', False));
  SaveStringToFile(AddBackslash(Work) + 'decisions.txt', Decisions, False);
  Result := False;
end;
