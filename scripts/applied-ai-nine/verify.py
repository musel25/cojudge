"""Check all published references against independent manual expectations."""
import copy
import json
from pathlib import Path
import re
import subprocess
import tempfile
import sys

sys.dont_write_bytecode = True
from cases import CASES, EXTRA_CASES

ROOT = Path(__file__).resolve().parents[2]

def encoded(value):
    return json.dumps(value, ensure_ascii=True, allow_nan=False, separators=(",", ":"))

def main():
    course_path = ROOT / "courses/applied-ai-nine/courseinfo.json"
    assert course_path.exists(), "Applied AI course is missing"
    course = json.loads(course_path.read_text())
    ordered = [slug for category in course["category-order"] for slug in course["problems-of-category"][category]]
    assert ordered == list(CASES), "Course must contain only the nine exercises in order"
    count = 0
    for slug, cases in CASES.items():
        directory = ROOT / "problems" / slug
        metadata = json.loads((directory / "metadata.json").read_text())
        assert metadata["id"] == slug
        assert metadata["functionName"] == "run"
        assert metadata["params"] == [{"name": "payload", "type": "string"}]
        assert metadata["outputType"] == "string"
        assert list(metadata["starterCode"]) == ["python"]
        assert metadata["studyMinutes"] > 0
        assert len(cases) >= 25
        assert len({encoded(c["data"]) for c in cases}) == len(cases), f"duplicate input in {slug}"
        official = json.loads((directory / "official-tests.json").read_text())
        assert official == [{"payload": encoded(c["data"])} for c in cases]
        all_cases = cases + EXTRA_CASES[slug]
        source = re.search(r"```python\n(.*?)\n```", (directory / "solution.md").read_text(), re.S).group(1)
        reference = {}
        exec(compile(source, str(directory / "solution.md"), "exec"), reference)
        starter = {}
        exec(metadata["starterCode"]["python"], starter)
        starter_failed = False
        try:
            starter["Solution"]().run(encoded(cases[0]["data"]))
        except NotImplementedError:
            starter_failed = True
        assert starter_failed, f"starter must be unfinished: {slug}"
        with tempfile.TemporaryDirectory(prefix="applied-ai-marker-") as temp:
            temp = Path(temp)
            (temp / "Marker.java").write_text((directory / "Marker.java").read_text())
            (temp / "Solution.java").write_text((directory / "Marker.java").read_text().replace("class Marker", "class Solution", 1))
            (temp / "Check.java").write_text('''import java.io.*;
class Check {
 public static void main(String[] args) throws Exception {
  Marker marker = new Marker();
  BufferedReader reader = new BufferedReader(new InputStreamReader(System.in, "UTF-8"));
  String line;
  while ((line = reader.readLine()) != null) {
   java.util.Map<String,Object> test = Marker.obj(Marker.J.parse(line));
   String payload = Marker.J.dump(test.get("data"));
   String expected = Marker.J.dump(test.get("expected"));
   if (!marker.isCorrect(payload, expected)) throw new AssertionError("manual answer rejected: " + line);
   if (!marker.isCorrect(payload, marker.run(payload))) throw new AssertionError("reference rejected");
   for (String wrong : new String[]{"null", "{}", "[]", "false", "0", "not json", expected + " trailing"})
    if (marker.isCorrect(payload, wrong)) throw new AssertionError("wrong candidate accepted: " + wrong);
   java.util.Map<String,Object> missing = new java.util.LinkedHashMap<>(Marker.obj(test.get("expected")));
   missing.remove(missing.keySet().iterator().next());
   if (marker.isCorrect(payload, Marker.J.dump(missing))) throw new AssertionError("missing field accepted");
   java.util.Map<String,Object> wrongType = new java.util.LinkedHashMap<>(Marker.obj(test.get("expected")));
   wrongType.put(wrongType.keySet().iterator().next(), "wrong type");
   if (marker.isCorrect(payload, Marker.J.dump(wrongType))) throw new AssertionError("wrong nested type accepted");
   java.util.Map<String,Object> reordered = new java.util.TreeMap<>(Marker.obj(test.get("expected")));
   if (!marker.isCorrect(payload, "  " + Marker.J.dump(reordered) + "  ")) throw new AssertionError("JSON formatting rejected");
   System.out.println(marker.run(payload));
  }
 }
}''')
            subprocess.run(["javac", "Marker.java", "Solution.java", "Check.java"], cwd=temp, check=True)
            result = subprocess.run(["java", "Check"], cwd=temp, input="".join(encoded(c) + "\n" for c in all_cases), text=True, capture_output=True, check=False)
            assert result.returncode == 0, f"{slug}: Java check failed:\n{result.stderr}"
            outputs = result.stdout.splitlines()
            assert len(outputs) == len(all_cases)
            for item, java in zip(all_cases, outputs):
                expected = item["expected"]
                data = copy.deepcopy(item["data"])
                actual = reference["solve"](data)
                assert actual == expected, f"{slug}: {item['name']}: Python {actual!r} != {expected!r}"
                assert json.loads(reference["Solution"]().run(encoded(item["data"]))) == expected
                assert json.loads(java) == expected, f"{slug}: {item['name']}: Java mismatch"
                count += 1
        print(f"PASS {slug}: {len(cases)} official manual cases + {len(EXTRA_CASES[slug])} extra cases; Python, Java, starter, and wrong candidates")
    print(f"PASS {len(CASES)} exercises, {count} total cases")

if __name__ == "__main__":
    main()
