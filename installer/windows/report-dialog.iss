{ Shared native failure dialog used by Setup and the compiled Windows UI regression fixture. }
var
  FailureReport: String;
  ReportMemo: TNewMemo;
  ReportStatus: TNewStaticText;

{ WM_COPY uses the native Unicode edit control; no shell, helper process or HTML clipboard API. }
function GetClipboardSequenceNumber: Cardinal;
  external 'GetClipboardSequenceNumber@user32.dll stdcall';

procedure CopyReportClick(Sender: TObject);
var
  Before: Cardinal;
begin
  Before := GetClipboardSequenceNumber;
  ReportMemo.SelectAll;
  SendMessage(ReportMemo.Handle, $0301, 0, 0);
  if GetClipboardSequenceNumber <> Before then
    ReportStatus.Caption := 'Report copied.'
  else
    ReportStatus.Caption := 'Clipboard unavailable. Select the report and press Ctrl+C to retry.';
end;

{ Use the bootstrap's sanitized UTF-8 report; retain useful context even if PowerShell could not start. }
function BuildFailureReport(Message: String): String;
var
  Lines: TArrayOfString;
  I: Integer;
  ReportFile: String;
begin
  ReportFile := GetIniString('Result', 'ReportFile', '', ResultFilePath);
  Result := '';
  if (ReportFile <> '') and LoadStringsFromFile(ReportFile, Lines) then
  begin
    for I := 0 to GetArrayLength(Lines) - 1 do Result := Result + Lines[I] + #13#10;
  end
  else
    Result := 'Promptbook Windows installer report' + #13#10 +
      'Version: {#Version}' + #13#10 +
      'Windows: ' + GetWindowsVersionString + #13#10 +
      'Stage: ' + PreparationStage + #13#10 +
      'Message: ' + Message + #13#10;
  Result := Result + #13#10 + 'Setup message: ' + Message + #13#10;
end;

{ Every handled setup error and decision has the same selectable, scrollable, copyable report.
  Copying leaves the dialog open and cannot count as Retry/Continue. }
function ShowFailure(Message, ActionCaption: String; ChooseFolder: Boolean): Integer;
var
  Form: TSetupForm;
  CopyButton, ActionButton, CancelButton, FolderButton: TNewButton;
begin
  LastFailure := Message;
  FailureReport := BuildFailureReport(Message);
  if WizardSilent then
  begin
    Log(FailureReport);
    Result := mrCancel;
    Exit;
  end;
  Form := CreateCustomForm(640, 440, False, False);
  try
    Form.Caption := 'Promptbook setup needs attention';
    Form.Position := poScreenCenter;
    ReportStatus := TNewStaticText.Create(Form);
    ReportStatus.Parent := Form;
    ReportStatus.SetBounds(ScaleX(16), ScaleY(12), Form.ClientWidth - ScaleX(32), ScaleY(32));
    ReportStatus.AutoSize := False;
    ReportStatus.Caption := 'Preparation did not finish. You can copy the details below for support.';
    ReportMemo := TNewMemo.Create(Form);
    ReportMemo.Parent := Form;
    ReportMemo.SetBounds(ScaleX(16), ScaleY(48), Form.ClientWidth - ScaleX(32), Form.ClientHeight - ScaleY(108));
    ReportMemo.ReadOnly := True;
    ReportMemo.ScrollBars := ssVertical;
    ReportMemo.WordWrap := True;
    ReportMemo.Text := FailureReport;
    CopyButton := TNewButton.Create(Form);
    CopyButton.Parent := Form;
    CopyButton.SetBounds(ScaleX(16), Form.ClientHeight - ScaleY(44), ScaleX(120), ScaleY(28));
    CopyButton.Caption := 'Copy report';
    CopyButton.OnClick := @CopyReportClick;
    CancelButton := TNewButton.Create(Form);
    CancelButton.Parent := Form;
    CancelButton.SetBounds(Form.ClientWidth - ScaleX(112), CopyButton.Top, ScaleX(96), CopyButton.Height);
    CancelButton.Caption := 'Cancel';
    CancelButton.ModalResult := mrCancel;
    CancelButton.Cancel := True;
    ActionButton := TNewButton.Create(Form);
    ActionButton.Parent := Form;
    ActionButton.SetBounds(CancelButton.Left - ScaleX(108), CopyButton.Top, ScaleX(100), CopyButton.Height);
    ActionButton.Caption := ActionCaption;
    ActionButton.ModalResult := mrOk;
    ActionButton.Default := True;
    if ChooseFolder then
    begin
      FolderButton := TNewButton.Create(Form);
      FolderButton.Parent := Form;
      FolderButton.SetBounds(ActionButton.Left - ScaleX(144), CopyButton.Top, ScaleX(136), CopyButton.Height);
      FolderButton.Caption := 'Choose folder...';
      FolderButton.ModalResult := mrYes;
    end;
    Form.ActiveControl := ActionButton;
    Result := Form.ShowModal;
  finally
    ReportMemo := nil;
    ReportStatus := nil;
    Form.Free;
  end;
end;

procedure FinishedReportClick(Sender: TObject);
begin
  ShowFailure(LastFailure, 'Close', False);
end;

