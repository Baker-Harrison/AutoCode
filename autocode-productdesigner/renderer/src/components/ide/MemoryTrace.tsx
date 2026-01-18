import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type RetrievalMethod = "semantic" | "keyword" | "hybrid" | "vector" | "bm25";

interface MemoryResult {
  id: string;
  content: string;
  score: number;
  source: string;
  sourceUrl?: string;
  timestamp: number;
}

interface MemoryTraceData {
  query: string;
  method: RetrievalMethod;
  results: MemoryResult[];
  latency: number;
  retrievedAt: number;
}

type MemoryTraceProps = {
  data: MemoryTraceData;
};

const methodBadgeColors: Record<RetrievalMethod, string> = {
  semantic: "bg-blue-500/20 text-blue-200 border-blue-500/30",
  keyword: "bg-purple-500/20 text-purple-200 border-purple-500/30",
  hybrid: "bg-cyan-500/20 text-cyan-200 border-cyan-500/30",
  vector: "bg-green-500/20 text-green-200 border-green-500/30",
  bm25: "bg-orange-500/20 text-orange-200 border-orange-500/30"
};

const getScoreColor = (score: number): string => {
  if (score >= 0.9) return "text-green-400";
  if (score >= 0.7) return "text-blue-400";
  if (score >= 0.5) return "text-amber-400";
  return "text-red-400";
};

export const MemoryTrace = ({ data }: MemoryTraceProps) => {
  return (
    <div className="grid gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Memory Retrieval Trace</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-zed-element rounded-md">
              <div className="flex items-center gap-3">
                <span className="text-xs text-zed-text-muted font-mono">QUERY</span>
                <span className="text-sm text-zed-text">{data.query}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`text-xs px-2 py-1 rounded-md border font-mono ${methodBadgeColors[data.method]}`}
                >
                  {data.method.toUpperCase()}
                </span>
                <span className="text-xs text-zed-text-muted font-mono">
                  {data.latency.toFixed(2)}ms
                </span>
              </div>
            </div>

            <div className="border-t border-zed-border-alt pt-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs text-zed-text-muted font-mono">
                  RESULTS ({data.results.length})
                </span>
                <span className="text-xs text-zed-text-muted font-mono">
                  {new Date(data.retrievedAt).toISOString()}
                </span>
              </div>

              <div className="space-y-2">
                {data.results.length === 0 ? (
                  <div className="text-sm text-zed-text-muted text-center py-8">No results found</div>
                ) : (
                  data.results.map((result) => (
                    <div
                      key={result.id}
                      className="p-3 bg-zed-element rounded-md border border-zed-border-alt hover:border-zed-border transition-colors"
                    >
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono ${getScoreColor(result.score)}`}>
                            {(result.score * 100).toFixed(1)}%
                          </span>
                          <span className="text-xs text-zed-text-muted font-mono">
                            {new Date(result.timestamp).toISOString()}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-zed-text-muted">source:</span>
                          {result.sourceUrl ? (
                            <a
                              href={result.sourceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-400 hover:underline"
                            >
                              {result.source}
                            </a>
                          ) : (
                            <span className="text-xs text-zed-text">{result.source}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-sm text-zed-text whitespace-pre-wrap">
                        {result.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="border-t border-zed-border-alt pt-4">
              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-zed-text-muted block">Total Results</span>
                  <span className="text-zed-text font-mono">{data.results.length}</span>
                </div>
                <div>
                  <span className="text-zed-text-muted block">Avg Relevance</span>
                  <span className="text-zed-text font-mono">
                    {data.results.length > 0
                      ? ((data.results.reduce((acc, r) => acc + r.score, 0) / data.results.length) * 100).toFixed(1)
                      : "0"}%
                  </span>
                </div>
                <div>
                  <span className="text-zed-text-muted block">Retrieval Time</span>
                  <span className="text-zed-text font-mono">{data.latency.toFixed(2)}ms</span>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
