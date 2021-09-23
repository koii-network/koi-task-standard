<h1 align="center">Storecat Scraping Task</h1>
<p align="center">
 <img align="center" height=512px src="diagram/koi_task_diagram.jpg?raw=true"></a>
</p>

This folder contains a template of the main features of a Koii Task. See the full docs in the parent folder for more information.

To register a new task, use the process below.

## RegisterExecutable

- takes `executableId` as input.

- Only owner of the contract can register the executable id.

```bash
export default function registerExecutableId(state, action) {
  const input = action.input;
  const caller = action.caller;
  const executableId = input.executableId;
  const owner = state.owner;
  if (caller !== owner) {
    throw new ContractError("Only owner can register");
  }
  if (!executableId) throw new ContractError("Invalid input");
  if (typeof executableId !== "string")
    throw new ContractError("Invalid input format");
  if (executableId.length !== 43)
    throw new ContractError("Input should have 43 characters");

  state.executableId = executableId;
  return { state };
}



```

## Testing Contract

`yarn build`

- `node test/attention.test.js path/to/wallet.json`
