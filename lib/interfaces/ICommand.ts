export interface ICommand {
  keyword: string;

  run (args): Boolean;
}
