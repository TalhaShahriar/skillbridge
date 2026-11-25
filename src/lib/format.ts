export function formatJobSourceLabel(
  source: string,
  datasetName: string
): string {
  if (source === "sample") {
    return `Source: ${datasetName} · sample`;
  }
  if (source === "manual-bd") {
    return `Source: ${datasetName} · manual-bd`;
  }
  return `Source: ${datasetName}`;
}
