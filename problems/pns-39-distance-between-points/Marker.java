import java.util.*;

class Marker {
    private String[] lines;
    private int position;

    private String nextLine() {
        if (position >= lines.length) throw new IllegalArgumentException("Missing input line");
        return lines[position++];
    }

    private int nextInt() { return Integer.parseInt(nextLine().trim()); }

    private List<Integer> ints(String text) {
        List<Integer> values = new ArrayList<>();
        if (text.trim().isEmpty()) return values;
        for (String part : text.trim().split("\\s+")) values.add(Integer.parseInt(part));
        return values;
    }

    private String join(List<Integer> values) {
        StringJoiner result = new StringJoiner(" ");
        for (int value : values) result.add(String.valueOf(value));
        return result.toString();
    }

    private String clean(String text) {
        String[] rows = text.replace("\r\n", "\n").split("\n", -1);
        List<String> kept = new ArrayList<>();
        for (String row : rows) kept.add(row.replaceAll("[ \t]+$", ""));
        while (!kept.isEmpty() && kept.get(kept.size() - 1).isEmpty()) kept.remove(kept.size() - 1);
        return String.join("\n", kept);
    }

    private List<Integer> outputNumbers(String text) {
        return ints(clean(text));
    }

    private String answer() {
        List<Integer> first = ints(nextLine());
        List<Integer> second = ints(nextLine());
        return String.valueOf(Math.abs(first.get(0) - second.get(0)) + Math.abs(first.get(1) - second.get(1)));
    }

    public String program(String input) {
        lines = (input == null ? "" : input).replace("\r\n", "\n").split("\n", -1);
        position = 0;
        return answer();
    }

    public boolean isCorrect(String input, String output) {
        try { return outputNumbers(program(input)).equals(outputNumbers(output)); } catch (NumberFormatException error) { return false; }
    }
}
