"""Manual examples. Expected answers do not call either reference solution."""
CASES = {}

def case(label, data, expected):
    return {"name": label, "data": data, "expected": expected}

def docs(*pairs):
    return [{"id": key, "text": text} for key, text in pairs]

def clean(label, source, expected):
    return case(label, {"documents": docs(*source)}, {"documents": docs(*expected)})

CASES["ai-01-clean-documents"] = [
    clean("collapse and deduplicate", [("a", "  A\tB "), ("b", "A B"), ("c", "\n")], [("a", "A B")]),
    clean("empty batch", [], []),
    clean("one document", [("a", "Hello")], [("a", "Hello")]),
    clean("empty text", [("a", "")], []),
    clean("spaces", [("a", "   ")], []),
    clean("tabs", [("a", "\t\t")], []),
    clean("newlines", [("a", "\n\r")], []),
    clean("form feed", [("a", "A\fB")], [("a", "A B")]),
    clean("vertical tab", [("a", "A\vB")], [("a", "A B")]),
    clean("strip ends", [("a", "\t A B\r")], [("a", "A B")]),
    clean("case sensitive", [("a", "AI"), ("b", "ai")], [("a", "AI"), ("b", "ai")]),
    clean("punctuation", [("a", "AI,  yes!")], [("a", "AI, yes!")]),
    clean("first id survives", [("z", "same"), ("a", "same")], [("z", "same")]),
    clean("preserve order", [("z", "Z"), ("a", "A")], [("z", "Z"), ("a", "A")]),
    clean("nonadjacent duplicate", [("a", "x"), ("b", "y"), ("c", "x")], [("a", "x"), ("b", "y")]),
    clean("all duplicate", [("a", "x"), ("b", " x "), ("c", "\tx")], [("a", "x")]),
    clean("unicode letters", [("a", "café  東京")], [("a", "café 東京")]),
    clean("quotes", [("a", 'say  "yes"')], [("a", 'say "yes"')]),
    clean("backslash", [("a", "a\\b  c")], [("a", "a\\b c")]),
    clean("numbers are text", [("a", "  42  007")], [("a", "42 007")]),
    clean("no substring dedup", [("a", "x"), ("b", "x y")], [("a", "x"), ("b", "x y")]),
    clean("internal mixed whitespace", [("a", "a \t\r\n b")], [("a", "a b")]),
    clean("empty before real", [("a", ""), ("b", "ok")], [("b", "ok")]),
    clean("blank between duplicate", [("a", "ok"), ("b", " "), ("c", "ok")], [("a", "ok")]),
    clean("distinct punctuation", [("a", "x!"), ("b", "x?")], [("a", "x!"), ("b", "x?")]),
]

def split(label, source, size, overlap, expected):
    chunks = [{"id": f"{doc}:{number}", "document_id": doc, "text": text} for doc, number, text in expected]
    return case(label, {"documents": docs(*source), "chunk_size": size, "overlap": overlap}, {"chunks": chunks})

CASES["ai-02-split-documents"] = [
    split("overlap", [("a", "one two three four five")], 3, 1, [("a",0,"one two three"),("a",1,"three four five")]),
    split("empty batch", [], 3, 1, []),
    split("empty text", [("a", "")], 2, 0, []),
    split("blank text", [("a", " \t\n")], 2, 1, []),
    split("short document", [("a", "one two")], 3, 0, [("a",0,"one two")]),
    split("exact size", [("a", "a b c")], 3, 2, [("a",0,"a b c")]),
    split("last partial", [("a", "a b c d")], 3, 0, [("a",0,"a b c"),("a",1,"d")]),
    split("no overlap", [("a", "a b c d")], 2, 0, [("a",0,"a b"),("a",1,"c d")]),
    split("maximum overlap", [("a", "a b c d e")], 3, 2, [("a",0,"a b c"),("a",1,"b c d"),("a",2,"c d e")]),
    split("size one", [("a", "a b c")], 1, 0, [("a",0,"a"),("a",1,"b"),("a",2,"c")]),
    split("two docs reset index", [("b", "a b"),("a","c d")], 1, 0, [("b",0,"a"),("b",1,"b"),("a",0,"c"),("a",1,"d")]),
    split("empty doc between", [("a", "x"),("b",""),("c","y")], 2, 1, [("a",0,"x"),("c",0,"y")]),
    split("normalize whitespace", [("a", " a\tb\nc\r ")], 2, 0, [("a",0,"a b"),("a",1,"c")]),
    split("keep case", [("a", "AI ai")], 1, 0, [("a",0,"AI"),("a",1,"ai")]),
    split("keep punctuation", [("a", "Hi, AI!")], 2, 1, [("a",0,"Hi, AI!")]),
    split("unicode words", [("a", "café 東京 fin")], 2, 1, [("a",0,"café 東京"),("a",1,"東京 fin")]),
    split("no redundant final chunk", [("a", "a b c d")], 3, 1, [("a",0,"a b c"),("a",1,"c d")]),
    split("one word with overlap", [("a", "x")], 5, 4, [("a",0,"x")]),
    split("two words maximum overlap", [("a", "a b c")], 2, 1, [("a",0,"a b"),("a",1,"b c")]),
    split("six no overlap", [("a", "a b c d e f")], 3, 0, [("a",0,"a b c"),("a",1,"d e f")]),
    split("six with overlap", [("a", "a b c d e f")], 3, 1, [("a",0,"a b c"),("a",1,"c d e"),("a",2,"e f")]),
    split("duplicate texts retained", [("a","x"),("b","x")], 2, 0, [("a",0,"x"),("b",0,"x")]),
    split("all whitespace types", [("a", "a\fb\vc")], 2, 0, [("a",0,"a b"),("a",1,"c")]),
    split("larger window", [("doc-1", "a b c d")], 10, 9, [("doc-1",0,"a b c d")]),
    split("partial maximum overlap", [("a", "a b c d e")], 4, 2, [("a",0,"a b c d"),("a",1,"c d e")]),
]

def search(label, query, vectors, k, ids):
    return case(label, {"query": query, "documents": [{"id": key, "vector": vector} for key, vector in vectors], "k": k}, {"ids": ids})

CASES["ai-03-find-similar-documents"] = [
    search("cosine rather than dot product", [1,0], [("b",[10,10]),("a",[1,0]),("c",[-1,0])], 2, ["a","b"]),
    search("no documents", [1], [], 2, []),
    search("zero k", [1], [("a",[1])], 0, []),
    search("k exceeds count", [1], [("a",[1])], 5, ["a"]),
    search("tie by id", [1,0], [("z",[2,0]),("a",[1,0])], 2, ["a","z"]),
    search("zero query", [0,0], [("z",[1,2]),("a",[-1,0]),("m",[0,0])], 3, ["a","m","z"]),
    search("zero document beats negative", [1,0], [("a",[-1,0]),("z",[0,0])], 2, ["z","a"]),
    search("negative similarities", [1,0], [("a",[-1,0]),("b",[-1,1])], 2, ["b","a"]),
    search("orthogonal tie", [1,0], [("b",[0,1]),("a",[0,-1])], 2, ["a","b"]),
    search("one negative", [1], [("a",[-5])], 1, ["a"]),
    search("negative query", [-1,0], [("a",[1,0]),("b",[-1,0])], 2, ["b","a"]),
    search("scale invariant", [2,2], [("b",[1,1]),("a",[5,5])], 2, ["a","b"]),
    search("three dimensions", [1,2,3], [("a",[3,2,1]),("b",[1,2,3])], 1, ["b"]),
    search("mixed signs", [1,-1], [("a",[1,1]),("b",[1,-1]),("c",[-1,1])], 3, ["b","a","c"]),
    search("all zero docs", [1,2], [("c",[0,0]),("a",[0,0]),("b",[0,0])], 2, ["a","b"]),
    search("id lexical order", [0], [("d2",[1]),("d10",[1]),("d1",[1])], 3, ["d1","d10","d2"]),
    search("large component", [100,0], [("a",[100,100]),("b",[1,0])], 2, ["b","a"]),
    search("opposite scale tie", [1], [("z",[-1]),("a",[-100])], 2, ["a","z"]),
    search("positive zero negative", [1], [("a",[-1]),("b",[0]),("c",[1])], 3, ["c","b","a"]),
    search("top tie truncated", [1,0], [("c",[1,0]),("a",[1,0]),("b",[1,0])], 1, ["a"]),
    search("query magnitude irrelevant", [100,100], [("x",[1,0]),("y",[1,1])], 2, ["y","x"]),
    search("zero vector tie sorted", [0,0,0], [("z",[0,0,1]),("A",[1,0,0])], 1, ["A"]),
    search("not distance", [1,0], [("a",[1,1]),("b",[100,0])], 1, ["b"]),
    search("negative orthogonal", [-1,-1], [("a",[1,-1]),("b",[-1,-1]),("c",[1,1])], 3, ["b","a","c"]),
    search("empty and zero k", [0], [], 0, []),
    search("binary rounding scaled-vector tie", [79,34], [("a",[16,-11]),("z",[48,-33])], 2, ["a","z"]),
]

def context(label, chunks, budget, ids, text, tokens):
    return case(label, {"chunks": [{"id": key,"text": value,"tokens": cost} for key,value,cost in chunks], "budget": budget}, {"ids": ids,"context": text,"used_tokens": tokens})

CASES["ai-04-build-context"] = [
    context("skip oversized and continue", [("a","large",8),("b","small",2),("c","last",3)],5,["b","c"],"small\n\nlast",5),
    context("empty input", [],10,[],"",0),
    context("zero budget", [("a","x",1)],0,[],"",0),
    context("exact fit", [("a","x",3)],3,["a"],"x",3),
    context("under budget", [("a","x",2)],3,["a"],"x",2),
    context("over budget", [("a","x",4)],3,[],"",0),
    context("rank order", [("z","Z",1),("a","A",1)],2,["z","a"],"Z\n\nA",2),
    context("separator has no cost", [("a","a",1),("b","b",1)],2,["a","b"],"a\n\nb",2),
    context("no final separator", [("a","x",1)],1,["a"],"x",1),
    context("greedy rather than knapsack", [("a","a",4),("b","b",3),("c","c",3)],6,["a"],"a",4),
    context("skip middle", [("a","a",2),("b","b",4),("c","c",1)],3,["a","c"],"a\n\nc",3),
    context("all oversized", [("a","a",9),("b","b",10)],2,[],"",0),
    context("preserve newlines", [("a","a\nb",2),("b","c",1)],3,["a","b"],"a\nb\n\nc",3),
    context("preserve whitespace", [("a","  x ",1)],2,["a"],"  x ",1),
    context("empty text still costs", [("a","",1)],1,["a"],"",1),
    context("empty texts separator", [("a","",1),("b","",1)],2,["a","b"],"\n\n",2),
    context("tokens authoritative", [("a","many words in this text",1)],1,["a"],"many words in this text",1),
    context("stop allocation after full", [("a","a",2),("b","b",1)],2,["a"],"a",2),
    context("duplicate text retained", [("a","x",1),("b","x",1)],2,["a","b"],"x\n\nx",2),
    context("large budget", [("a","a",100),("b","b",200)],1000,["a","b"],"a\n\nb",300),
    context("one left unused", [("a","a",2),("b","b",2)],3,["a"],"a",2),
    context("skip two then fit", [("a","a",9),("b","b",8),("c","c",1)],1,["c"],"c",1),
    context("unicode text", [("a","東京",2)],2,["a"],"東京",2),
    context("empty zero", [],0,[],"",0),
    context("later exact remainder", [("a","a",2),("b","b",4),("c","c",3)],5,["a","c"],"a\n\nc",5),
    context("duplicate id ignored", [("a","first",1),("a","second",1)],2,["a"],"first",1),
    context("oversized first occurrence blocks duplicate", [("a","large",9),("a","small",1),("b","fits",1)],2,["b"],"fits",1),
    context("duplicate after another chunk", [("a","A",1),("b","B",1),("a","C",1)],3,["a","b"],"A\n\nB",2),
]

def task(title="Write tests", priority="medium", due_date="2026-11-04", **extra):
    return {"title": title,"priority": priority,"due_date": due_date, **extra}

def validate(label, values, accepted, errors):
    return case(label,{"tasks": values},{"tasks": accepted,"errors": [{"index":index,"errors":fields} for index,fields in errors]})

CASES["ai-05-validate-extracted-tasks"] = [
    validate("clean and reject", [task(" Fix bug "),task(priority="urgent")], [task("Fix bug")],[(1,["priority"])]),
    validate("empty batch",[],[],[]),
    validate("one valid",[task()],[task()],[]),
    validate("empty title",[task(title="")],[],[(0,["title"])]),
    validate("blank title",[task(title=" \t\n")],[],[(0,["title"])]),
    validate("title type",[task(title=12)],[],[(0,["title"])]),
    validate("low priority",[task(priority="low")],[task(priority="low")],[]),
    validate("high priority",[task(priority="high")],[task(priority="high")],[]),
    validate("priority case sensitive",[task(priority="High")],[],[(0,["priority"])]),
    validate("priority not trimmed",[task(priority=" low ")],[],[(0,["priority"])]),
    validate("priority type",[task(priority=None)],[],[(0,["priority"])]),
    validate("missing title",[{"priority":"low","due_date":"2026-11-04"}],[],[(0,["title"])]),
    validate("missing priority",[{"title":"A","due_date":"2026-11-04"}],[],[(0,["priority"])]),
    validate("missing date",[{"title":"A","priority":"low"}],[],[(0,["due_date"])]),
    validate("unknown field",[task(extra="x")],[],[(0,["fields"])]),
    validate("not object",[None,[],"task",7,True],[],[(0,["record"]),(1,["record"]),(2,["record"]),(3,["record"]),(4,["record"])]),
    validate("all required missing",[{}],[],[(0,["title","priority","due_date"])]),
    validate("trim title only",[task(title="  fix  bug  ")],[task(title="fix  bug")],[]),
    validate("date real calendar",[task(due_date="2026-02-29")],[],[(0,["due_date"])]),
    validate("leap day",[task(due_date="2028-02-29")],[task(due_date="2028-02-29")],[]),
    validate("date exact width",[task(due_date="2026-1-04"),task(due_date="20261104")],[],[(0,["due_date"]),(1,["due_date"])]),
    validate("date not trimmed",[task(due_date=" 2026-11-04")],[],[(0,["due_date"])]),
    validate("date type",[task(due_date=20261104)],[],[(0,["due_date"])]),
    validate("multiple errors in fixed order",[task(title=False,priority="urgent",due_date="2026-04-31",extra=1)],[],[(0,["fields","title","priority","due_date"])]),
    validate("duplicate valid tasks retained",[task(),task()],[task(),task()],[]),
    validate("century leap rule",[task(due_date="1900-02-29"),task(due_date="2000-02-29")],[task(due_date="2000-02-29")],[(0,["due_date"])]),
    validate("year zero",[task(due_date="0000-01-01")],[],[(0,["due_date"])]),
    validate("valid unicode title",[task(title="修正")],[task(title="修正")],[]),
]

def citations(label, sources, references, valid, invalid):
    return case(label,{"source_ids": sources,"answers":[{"text":text,"citations":refs} for text,refs in references]}, {"valid":valid,"invalid":invalid})

CASES["ai-06-check-citations"] = [
    citations("known missing unknown",["doc-a"],[("A",["doc-a"]),("B",[]),("C",["other"])],[0],[1,2]),
    citations("empty answers",[],[],[],[]),
    citations("one known",["a"],[("x",["a"])],[0],[]),
    citations("no citations",["a"],[("x",[])],[],[0]),
    citations("no sources",[],[("x",["a"])],[],[0]),
    citations("empty both",[],[("x",[])],[],[0]),
    citations("one unknown among known",["a","b"],[("x",["a","c"])],[],[0]),
    citations("all known",["a","b"],[("x",["a","b"])],[0],[]),
    citations("duplicate known allowed",["a"],[("x",["a","a"])],[0],[]),
    citations("duplicate unknown",["a"],[("x",["z","z"])],[],[0]),
    citations("case sensitive",["A"],[("x",["a"])],[],[0]),
    citations("no trimming",["a"],[("x",[" a"])],[],[0]),
    citations("text ignored",["a"],[("",["a"])],[0],[]),
    citations("no truth judgment",["a"],[("The moon is cheese.",["a"])],[0],[]),
    citations("known order irrelevant",["a","b"],[("x",["b","a"])],[0],[]),
    citations("answer order retained",["a"],[("b",["z"]),("a",["a"]),("c",[])],[1],[0,2]),
    citations("all valid",["a"],[("x",["a"]),("y",["a"])],[0,1],[]),
    citations("all invalid",["a"],[("x",[]),("y",["b"])],[],[0,1]),
    citations("similar ids",["doc-10"],[("x",["doc-1"])],[],[0]),
    citations("unicode text ignored",["a"],[("東京",["a"])],[0],[]),
    citations("source id exact punctuation",["doc_1"],[("x",["doc-1"])],[],[0]),
    citations("unused sources fine",["a","b","c"],[("x",["b"])],[0],[]),
    citations("multiple missing",["a"],[("x",["a","b","c"])],[],[0]),
    citations("one valid late",["a"],[("x",[]),("y",["z"]),("z",["a"])],[2],[0,1]),
    citations("all sources empty answers",["a","b"],[],[],[]),
]

def evaluate(label, questions, k, rate, failed):
    return case(label,{"questions":[{"id":key,"retrieved":retrieved,"relevant":relevant} for key,retrieved,relevant in questions],"k":k},{"hit_rate":rate,"failed_ids":failed})

CASES["ai-07-evaluate-search"] = [
    evaluate("hit and failed question",[("q1",["x","a"],["a"]),("q2",["y"],["b"])],2,0.5,["q2"]),
    evaluate("empty questions",[],3,0,[]),
    evaluate("perfect",[("q",["a"],["a"])],1,1,[]),
    evaluate("no hit",[("q",["x"],["a"])],1,0,["q"]),
    evaluate("empty retrieved",[("q",[],["a"])],3,0,["q"]),
    evaluate("empty relevant",[("q",["a"],[])],3,0,["q"]),
    evaluate("both empty",[("q",[],[])],3,0,["q"]),
    evaluate("zero k",[("q",["a"],["a"])],0,0,["q"]),
    evaluate("cutoff excludes hit",[("q",["x","a"],["a"])],1,0,["q"]),
    evaluate("k exceeds retrieved",[("q",["a"],["a","b"])],5,1,[]),
    evaluate("duplicate retrieval one success",[("q",["a","a"],["a"])],2,1,[]),
    evaluate("duplicate relevant",[("q",["a"],["a","a"])],1,1,[]),
    evaluate("hit at rank three",[("q",["x","y","a"],["a"])],3,1,[]),
    evaluate("two of three",[("a",["x"],["x"]),("b",["y"],["y"]),("c",["z"],["other"])],1,0.666667,["c"]),
    evaluate("empty question counts",[("a",["x"],["x"]),("b",[],[])],2,0.5,["b"]),
    evaluate("one of several relevant enough",[("q",["b"],["a","b","c"])],1,1,[]),
    evaluate("two relevant still one success",[("q",["a","b"],["a","b"])],2,1,[]),
    evaluate("case sensitive",[("q",["A"],["a"])],1,0,["q"]),
    evaluate("ids not trimmed",[("q",[" a"],["a"])],1,0,["q"]),
    evaluate("duplicate consumes slots",[("q",["x","x","a"],["a"])],2,0,["q"]),
    evaluate("keep failed question order",[("z",[],["a"]),("a",[],["a"])],2,0,["z","a"]),
    evaluate("one of three",[("a",["a"],["a"]),("b",["x"],["b"]),("c",["x"],["c"])],1,0.333333,["b","c"]),
    evaluate("hit at final allowed position",[("q",["w","x","y","a"],["a"])],4,1,[]),
    evaluate("all fail",[("a",["x"],["a"]),("b",["x"],["b"]),("c",["x"],["c"])],3,0,["a","b","c"]),
    evaluate("all succeed",[("a",["a"],["a"]),("b",["b"],["b"])],1,1,[]),
]

def entry(model, text, vector):
    return {"model":model,"text":text,"embedding":vector}

def cache(label, initial, requests, embeddings, final, calls):
    return case(label,{"cache":[entry(*x) for x in initial],"requests":[{"model":m,"text":t,"fresh_embedding":v} for m,t,v in requests]}, {"embeddings":embeddings,"cache":[entry(*x) for x in final],"calls":calls})

CASES["ai-08-cache-embeddings"] = [
    cache("repeat hit",[],[("m","x",[1]),("m","x",[9])],[[1],[1]],[("m","x",[1])],1),
    cache("empty",[],[],[],[],0),
    cache("initial retained",[("m","x",[1])],[],[],[("m","x",[1])],0),
    cache("initial hit",[("m","x",[1])],[("m","x",[9])],[[1]],[("m","x",[1])],0),
    cache("miss",[],[("m","x",[2,3])],[[2,3]],[("m","x",[2,3])],1),
    cache("model in key",[],[("a","x",[1]),("b","x",[2])],[[1],[2]],[("a","x",[1]),("b","x",[2])],2),
    cache("text in key",[],[("m","x",[1]),("m","y",[2])],[[1],[2]],[("m","x",[1]),("m","y",[2])],2),
    cache("case sensitive text",[],[("m","A",[1]),("m","a",[2])],[[1],[2]],[("m","A",[1]),("m","a",[2])],2),
    cache("case sensitive model",[],[("M","x",[1]),("m","x",[2])],[[1],[2]],[("M","x",[1]),("m","x",[2])],2),
    cache("do not trim text",[],[("m"," x",[1]),("m","x",[2])],[[1],[2]],[("m"," x",[1]),("m","x",[2])],2),
    cache("empty text",[],[("m","",[0])],[[0]],[("m","",[0])],1),
    cache("zero vector cache hit",[("m","x",[0,0])],[("m","x",[1,1])],[[0,0]],[("m","x",[0,0])],0),
    cache("negative vectors",[],[("m","x",[-1,2])],[[-1,2]],[("m","x",[-1,2])],1),
    cache("preserve initial order",[("z","z",[9]),("a","a",[1])],[("a","a",[8])],[[1]],[("z","z",[9]),("a","a",[1])],0),
    cache("append misses",[("m","x",[1])],[("m","y",[2])],[[2]],[("m","x",[1]),("m","y",[2])],1),
    cache("nonadjacent repeat",[],[("m","x",[1]),("m","y",[2]),("m","x",[3])],[[1],[2],[1]],[("m","x",[1]),("m","y",[2])],2),
    cache("delimiter collision",[],[("a:b","c",[1]),("a","b:c",[2])],[[1],[2]],[("a:b","c",[1]),("a","b:c",[2])],2),
    cache("unicode text",[],[("m","東京",[1]),("m","東京",[2])],[[1],[1]],[("m","東京",[1])],1),
    cache("new model with old text",[("v1","x",[1])],[("v2","x",[2])],[[2]],[("v1","x",[1]),("v2","x",[2])],1),
    cache("initial ignored fresh",[("m","x",[1,2])],[("m","x",[3])],[[1,2]],[("m","x",[1,2])],0),
    cache("multiple old hits",[("m","x",[1]),("m","y",[2])],[("m","y",[9]),("m","x",[8])],[[2],[1]],[("m","x",[1]),("m","y",[2])],0),
    cache("new empty vector",[],[("m","x",[])],[[]],[("m","x",[])],1),
    cache("newline is exact text",[],[("m","a\nb",[1]),("m","a b",[2])],[[1],[2]],[("m","a\nb",[1]),("m","a b",[2])],2),
    cache("empty model allowed",[],[("","x",[1])],[[1]],[("","x",[1])],1),
    cache("three equal requests",[],[("m","x",[1]),("m","x",[2]),("m","x",[3])],[[1],[1],[1]],[("m","x",[1])],1),
]

def retry(label, requests, limit, expected):
    return case(label,{"requests":[{"id":key,"outcomes":outcomes} for key,outcomes in requests],"max_attempts":limit},{"results":[{"id":key,"status":status,"attempts":attempts,"last_outcome":last} for key,status,attempts,last in expected]})

CASES["ai-09-retry-failed-requests"] = [
    retry("retry then succeed",[("a",["timeout","ok"])],3,[("a","ok",2,"ok")]),
    retry("empty requests",[],3,[]),
    retry("immediate success",[("a",["ok"])],3,[("a","ok",1,"ok")]),
    retry("permanent bad request",[("a",["bad_request","ok"])],3,[("a","failed",1,"bad_request")]),
    retry("permanent unauthorized",[("a",["unauthorized","ok"])],3,[("a","failed",1,"unauthorized")]),
    retry("limit one",[("a",["timeout","ok"])],1,[("a","failed",1,"timeout")]),
    retry("limit two exhausted",[("a",["timeout","server_error","ok"])],2,[("a","failed",2,"server_error")]),
    retry("success at limit",[("a",["timeout","rate_limit","ok"])],3,[("a","ok",3,"ok")]),
    retry("outcomes exhausted",[("a",["timeout"])],5,[("a","failed",1,"timeout")]),
    retry("rate limit retried",[("a",["rate_limit","ok"])],2,[("a","ok",2,"ok")]),
    retry("server error retried",[("a",["server_error","ok"])],2,[("a","ok",2,"ok")]),
    retry("stop after success",[("a",["ok","bad_request"])],3,[("a","ok",1,"ok")]),
    retry("permanent after temporary",[("a",["timeout","bad_request","ok"])],3,[("a","failed",2,"bad_request")]),
    retry("all temporary",[("a",["timeout","rate_limit","server_error"])],3,[("a","failed",3,"server_error")]),
    retry("independent requests",[("a",["timeout","ok"]),("b",["ok"])],2,[("a","ok",2,"ok"),("b","ok",1,"ok")]),
    retry("preserve request order",[("z",["ok"]),("a",["bad_request"])],2,[("z","ok",1,"ok"),("a","failed",1,"bad_request")]),
    retry("unauthorized after rate limit",[("a",["rate_limit","unauthorized","ok"])],4,[("a","failed",2,"unauthorized")]),
    retry("single bad request",[("a",["bad_request"])],1,[("a","failed",1,"bad_request")]),
    retry("single unauthorized",[("a",["unauthorized"])],1,[("a","failed",1,"unauthorized")]),
    retry("single rate limit",[("a",["rate_limit"])],1,[("a","failed",1,"rate_limit")]),
    retry("single server error",[("a",["server_error"])],1,[("a","failed",1,"server_error")]),
    retry("two temporary exhausted early",[("a",["server_error","timeout"])],4,[("a","failed",2,"timeout")]),
    retry("success before limit",[("a",["server_error","ok","ok"])],5,[("a","ok",2,"ok")]),
    retry("two failures independent",[("a",["bad_request"]),("b",["timeout","ok"])],1,[("a","failed",1,"bad_request"),("b","failed",1,"timeout")]),
    retry("three retries",[("a",["timeout","timeout","rate_limit","ok"])],4,[("a","ok",4,"ok")]),
]

# Additional boundary cases. These do not become official submission cases.
EXTRA_CASES = {
    "ai-01-clean-documents": [
        clean("100 duplicate documents", [(f"d{i}", "  café\t東京\n") for i in range(100)], [("d0", "café 東京")]),
        clean("long text preserved", [("a", "x" * 10000)], [("a", "x" * 10000)]),
    ],
    "ai-02-split-documents": [
        split("100 independent documents", [(f"d{i}", "word") for i in range(100)], 100, 99,
              [(f"d{i}", 0, "word") for i in range(100)]),
        split("maximum overlap advances", [("a", "x x x x x")], 2, 1,
              [("a", 0, "x x"), ("a", 1, "x x"), ("a", 2, "x x"), ("a", 3, "x x")]),
    ],
    "ai-03-find-similar-documents": [
        search("100 equal 32-dimensional vectors", [100] * 32,
               [(f"d{i:03d}", [100] * 32) for i in reversed(range(100))], 100,
               [f"d{i:03d}" for i in range(100)]),
        search("zero and negative zero tie", [1, 0], [("z", [0, -100]), ("a", [0, 0])], 2, ["a", "z"]),
    ],
    "ai-04-build-context": [
        context("100 duplicate IDs after oversized first", [("a", "first", 10000)] + [("a", "later", 1)] * 99,
                9999, [], "", 0),
        context("100 accepted chunks", [(f"d{i}", "x", 1) for i in range(100)], 100,
                [f"d{i}" for i in range(100)], "\n\n".join(["x"] * 100), 100),
    ],
    "ai-05-validate-extracted-tasks": [
        validate("date year bounds", [task(due_date="0001-01-01"), task(due_date="9999-12-31")],
                 [task(due_date="0001-01-01"), task(due_date="9999-12-31")], []),
        validate("invalid months and days", [task(due_date=value) for value in ["2026-00-01", "2026-13-01", "2026-01-00", "2026-01-32"]],
                 [], [(i, ["due_date"]) for i in range(4)]),
        validate("100 invalid records", [False] * 100, [], [(i, ["record"]) for i in range(100)]),
        validate("trim control whitespace", [task(title="\t\n\r\f\vtitle\v\f\r\n\t")], [task(title="title")], []),
    ],
    "ai-06-check-citations": [
        citations("100 answers without citations", ["a"], [("x", [])] * 100, [], list(range(100))),
        citations("100 known citations", [f"d{i}" for i in range(100)], [("x", [f"d{i}" for i in range(100)])], [0], []),
    ],
    "ai-07-evaluate-search": [
        evaluate("one success out of 100", [(f"q{i}", ["a"], ["a"] if i == 0 else ["b"]) for i in range(100)],
                 100, 0.01, [f"q{i}" for i in range(1, 100)]),
        evaluate("first 100 positions", [("q", ["x"] * 99 + ["a"], ["a"])], 100, 1, []),
    ],
    "ai-08-cache-embeddings": [
        cache("100 requests one call", [], [("m", "same", [i]) for i in range(100)],
              [[0]] * 100, [("m", "same", [0])], 1),
        cache("newline delimiter collision", [], [("a\nb", "c", [1]), ("a", "b\nc", [2])],
              [[1], [2]], [("a\nb", "c", [1]), ("a", "b\nc", [2])], 2),
    ],
    "ai-09-retry-failed-requests": [
        retry("100 requests with 100 attempts", [(f"r{i}", ["timeout"] * 100) for i in range(100)], 100,
              [(f"r{i}", "failed", 100, "timeout") for i in range(100)]),
        retry("success on attempt 100", [("a", ["server_error"] * 99 + ["ok"])], 100,
              [("a", "ok", 100, "ok")]),
    ],
}
