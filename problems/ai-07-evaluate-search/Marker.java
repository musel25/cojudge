import java.util.*;
import java.math.*;

// JSON helpers and codec adapted from capital-one-prep/cojudge/problems/c1-01-strict-numeric-fields/Marker.java.
// Exercise reference logic is independent of the Python solution.
class Marker {
    public Object solve(Map<String,Object> d) {
        List<Object> questions=arr(d.get("questions")), failed=new ArrayList<>();
        for(Object value:questions) {
            Map<String,Object> question=obj(value); Set<Object> relevant=new HashSet<>(arr(question.get("relevant")));
            List<Object> retrieved=arr(question.get("retrieved")); boolean hit=false;
            for(int i=0;i<Math.min(n(d.get("k")),retrieved.size());i++) if(relevant.contains(retrieved.get(i))) hit=true;
            if(!hit) failed.add(question.get("id"));
        }
        BigDecimal rate=questions.isEmpty()?BigDecimal.ZERO:BigDecimal.valueOf(questions.size()-failed.size()).divide(BigDecimal.valueOf(questions.size()),6,RoundingMode.HALF_UP);
        return map("hit_rate",rate,"failed_ids",failed);
    }

    public String run(String payload) { return J.dump(solve(obj(J.parse(payload)))); }
    public boolean isCorrect(String payload, String output) {
        try { return J.equal(J.parse(run(payload)), J.parse(output)); }
        catch (Exception error) { return false; }
    }

    @SuppressWarnings("unchecked") static Map<String,Object> obj(Object x) { return (Map<String,Object>) x; }
    @SuppressWarnings("unchecked") static List<Object> arr(Object x) { return (List<Object>) x; }
    static String s(Object x) { return (String) x; }
    static int n(Object x) { return ((Number) x).intValue(); }
    static long lng(Object x) { return ((Number) x).longValue(); }
    static boolean isInteger(Object x) {
        return x instanceof BigInteger || x instanceof Byte || x instanceof Short || x instanceof Integer || x instanceof Long;
    }
    static boolean b(Object x) { return (Boolean) x; }
    static Map<String,Object> map(Object... pairs) {
        if (pairs.length % 2 != 0) throw new IllegalArgumentException("Unpaired map key");
        Map<String,Object> out = new LinkedHashMap<>();
        for (int i = 0; i < pairs.length; i += 2) out.put((String) pairs[i], pairs[i + 1]);
        return out;
    }
    static List<Object> list(Object... values) { return new ArrayList<>(Arrays.asList(values)); }

    /** Small, strict JSON codec. Each marker has its own namespace. */
    static class J {
        private final String text;
        private int pos;
        private J(String text) { this.text = text; }
        static Object parse(String text) {
            J reader = new J(text);
            Object out = reader.value();
            reader.space();
            if (reader.pos != text.length()) throw new IllegalArgumentException("Trailing JSON data");
            return out;
        }
        private void space() {
            while (pos < text.length() && " \n\r\t".indexOf(text.charAt(pos)) >= 0) pos++;
        }
        private char take() {
            if (pos >= text.length()) throw new IllegalArgumentException("Unexpected end of JSON");
            return text.charAt(pos++);
        }
        private boolean consume(char ch) {
            space();
            if (pos < text.length() && text.charAt(pos) == ch) { pos++; return true; }
            return false;
        }
        private void require(char ch) {
            if (!consume(ch)) throw new IllegalArgumentException("Expected " + ch);
        }
        private Object value() {
            space();
            if (pos >= text.length()) throw new IllegalArgumentException("Missing JSON value");
            char ch = text.charAt(pos);
            if (ch == '"') return string();
            if (ch == '{') {
                pos++;
                Map<String,Object> out = new LinkedHashMap<>();
                if (consume('}')) return out;
                do {
                    space();
                    String key = string();
                    require(':');
                    if (out.containsKey(key)) throw new IllegalArgumentException("Duplicate JSON key");
                    out.put(key, value());
                } while (consume(','));
                require('}');
                return out;
            }
            if (ch == '[') {
                pos++;
                List<Object> out = new ArrayList<>();
                if (consume(']')) return out;
                do { out.add(value()); } while (consume(','));
                require(']');
                return out;
            }
            for (String word : new String[]{"true", "false", "null"}) {
                if (text.startsWith(word, pos)) {
                    pos += word.length();
                    return word.equals("null") ? null : Boolean.valueOf(word);
                }
            }
            java.util.regex.Matcher match = java.util.regex.Pattern
                .compile("-?(?:0|[1-9][0-9]*)(?:\\.[0-9]+)?(?:[eE][+-]?[0-9]+)?")
                .matcher(text.substring(pos));
            if (!match.lookingAt()) throw new IllegalArgumentException("Invalid JSON value");
            pos += match.end();
            String token = match.group();
            if (!token.contains(".") && !token.contains("e") && !token.contains("E")) return new BigInteger(token);
            BigDecimal decimal = new BigDecimal(token);
            // Preserve a floating JSON token when a parsed value is encoded again.
            return decimal.scale() <= 0 ? decimal.setScale(1) : decimal;
        }
        private String string() {
            if (take() != '"') throw new IllegalArgumentException("Expected JSON string");
            StringBuilder out = new StringBuilder();
            while (true) {
                char ch = take();
                if (ch == '"') return out.toString();
                if (ch < 32) throw new IllegalArgumentException("Unescaped control character");
                if (ch != '\\') { out.append(ch); continue; }
                char escape = take();
                switch (escape) {
                    case '"': case '\\': case '/': out.append(escape); break;
                    case 'b': out.append('\b'); break;
                    case 'f': out.append('\f'); break;
                    case 'n': out.append('\n'); break;
                    case 'r': out.append('\r'); break;
                    case 't': out.append('\t'); break;
                    case 'u':
                        if (pos + 4 > text.length()) throw new IllegalArgumentException("Short Unicode escape");
                        String hex = text.substring(pos, pos + 4);
                        if (!hex.matches("[0-9a-fA-F]{4}")) throw new IllegalArgumentException("Invalid Unicode escape");
                        out.append((char) Integer.parseInt(hex, 16));
                        pos += 4;
                        break;
                    default: throw new IllegalArgumentException("Invalid JSON escape");
                }
            }
        }
        static String dump(Object x) {
            if (x == null) return "null";
            if (x instanceof String) {
                StringBuilder out = new StringBuilder("\"");
                for (char ch : ((String) x).toCharArray()) {
                    if (ch == '"' || ch == '\\') out.append('\\').append(ch);
                    else if (ch < 32) out.append(String.format("\\u%04x", (int) ch));
                    else out.append(ch);
                }
                return out.append('"').toString();
            }
            if (x instanceof Boolean) return x.toString();
            if (x instanceof Number) return new BigDecimal(x.toString()).toPlainString();
            if (x instanceof Map<?,?>) {
                List<String> entries = new ArrayList<>();
                for (Map.Entry<?,?> e : ((Map<?,?>) x).entrySet()) {
                    if (!(e.getKey() instanceof String)) throw new IllegalArgumentException("JSON key must be a string");
                    entries.add(dump(e.getKey()) + ":" + dump(e.getValue()));
                }
                return "{" + String.join(",", entries) + "}";
            }
            if (x instanceof Iterable<?>) {
                List<String> entries = new ArrayList<>();
                for (Object value : (Iterable<?>) x) entries.add(dump(value));
                return "[" + String.join(",", entries) + "]";
            }
            if (x.getClass().isArray()) {
                List<String> entries = new ArrayList<>();
                for (int i = 0; i < java.lang.reflect.Array.getLength(x); i++)
                    entries.add(dump(java.lang.reflect.Array.get(x, i)));
                return "[" + String.join(",", entries) + "]";
            }
            throw new IllegalArgumentException("Not a JSON value: " + x.getClass());
        }
        static boolean equal(Object a, Object b) {
            if (a == null || b == null) return a == b;
            if (a instanceof Number && b instanceof Number)
                return new BigDecimal(a.toString()).compareTo(new BigDecimal(b.toString())) == 0;
            if (a instanceof Map<?,?> && b instanceof Map<?,?>) {
                Map<?,?> x = (Map<?,?>) a, y = (Map<?,?>) b;
                if (!x.keySet().equals(y.keySet())) return false;
                for (Object key : x.keySet()) if (!equal(x.get(key), y.get(key))) return false;
                return true;
            }
            if (a instanceof List<?> && b instanceof List<?>) {
                List<?> x = (List<?>) a, y = (List<?>) b;
                if (x.size() != y.size()) return false;
                for (int i = 0; i < x.size(); i++) if (!equal(x.get(i), y.get(i))) return false;
                return true;
            }
            return a.getClass() == b.getClass() && a.equals(b);
        }
    }
}
