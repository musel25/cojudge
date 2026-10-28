# Custom problem presentation

Custom courses can supply two optional metadata fields alongside real input/output
examples:

```json
{
  "testCaseDescriptions": {
    "test_motorbike": {
      "title": "test_motorbike",
      "code": "bike = Motorbike(\"Yamaha\", \"R3\", 2, 321)\nassert bike.rev_engine() == \"Yamaha R3 with 2 wheels goes Vroom vroom!\""
    }
  },
  "courseHelp": {
    "title": "Course help",
    "body": "Keep the supplied tests and runner unchanged."
  }
}
```

The Test Case panel resolves a JSON `payload` selector with a `test` or `check`
field to the corresponding description. It shows the real code by default.
**Edit test selection** opens the selector editor. Adding a case opens its input
editor. Unknown selectors and ordinary function inputs remain editable.

These fields only affect presentation. The runner receives the original test
input. Course help appears in a closed section below the statement and examples.
Problems without these fields keep their existing display.

The nine custom courses are authored in `capital-one-prep`. Their presentation
refresh command updates only `statement.md`, examples, check descriptions, and
course help. It preserves execution code and tests. See `cojudge/PRESENTATION.md`
in that repository.
