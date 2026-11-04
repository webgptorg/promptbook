{ Windows argv quoting must double trailing backslashes before the closing quote (including drive roots). }
function Quoted(Value: String): String;
var
  I, J, Slashes, Count: Integer;
begin
  Result := '"';
  Slashes := 0;
  for I := 1 to Length(Value) do
    if Value[I] = '\' then Slashes := Slashes + 1
    else
    begin
      Count := Slashes;
      if Value[I] = '"' then Count := Slashes * 2 + 1;
      for J := 1 to Count do Result := Result + '\';
      Result := Result + Value[I];
      Slashes := 0;
    end;
  for J := 1 to Slashes * 2 do Result := Result + '\';
  Result := Result + '"';
end;

