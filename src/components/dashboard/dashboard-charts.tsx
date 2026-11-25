"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  LabelList,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  RoleCountItem,
  SplitItem,
  TopSkillItem,
} from "@/server/services/dashboard";

const CHART_COLORS = [
  "#2563eb",
  "#0d9488",
  "#d97706",
  "#64748b",
  "#7c3aed",
];

export function TopSkillsChart({ data }: { data: TopSkillItem[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No skill data available for this selection.
      </p>
    );
  }

  const chartData = data.map((d) => ({
    ...d,
    pctLabel: `${d.pct}%`,
  }));

  const height = Math.max(260, chartData.length * 32);

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 48, left: 16, bottom: 4 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" domain={[0, 100]} unit="%" fontSize={12} />
          <YAxis
            type="category"
            dataKey="name"
            width={120}
            fontSize={12}
            tickLine={false}
          />
          <Tooltip
            formatter={(value) => [`${value ?? 0}% of jobs`, "Demand"]}
          />
          <Bar dataKey="pct" fill="#2563eb" radius={[0, 4, 4, 0]}>
            <LabelList
              dataKey="pctLabel"
              position="right"
              fontSize={11}
              fill="#475569"
            />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function JobsByRoleChart({ data }: { data: RoleCountItem[] }) {
  if (data.length === 0) {
    return (
      <p className="py-12 text-center text-sm text-muted-foreground">
        No role breakdown available yet.
      </p>
    );
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, left: 0, bottom: 48 }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            fontSize={11}
            angle={-25}
            textAnchor="end"
            interval={0}
            height={60}
          />
          <YAxis allowDecimals={false} fontSize={12} />
          <Tooltip formatter={(value) => [`${value ?? 0} postings`, "Jobs"]} />
          <Bar dataKey="count" fill="#0d9488" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function SplitDonutChart({ data }: { data: SplitItem[] }) {
  if (data.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        No data yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-3 sm:flex-row">
      <div className="h-44 w-44 shrink-0">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={42}
              outerRadius={68}
              paddingAngle={2}
            >
              {data.map((entry, idx) => (
                <Cell
                  key={entry.name}
                  fill={CHART_COLORS[idx % CHART_COLORS.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value) => [`${value ?? 0}`, "Postings"]} />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <ul className="flex-1 space-y-1.5 text-xs">
        {data.map((entry, idx) => (
          <li
            key={entry.name}
            className="flex items-center justify-between gap-2"
          >
            <span className="flex items-center gap-2">
              <span
                className="inline-block size-2.5 rounded-full"
                style={{
                  backgroundColor: CHART_COLORS[idx % CHART_COLORS.length],
                }}
              />
              <span>{entry.name}</span>
            </span>
            <span className="font-medium text-muted-foreground">
              {entry.value}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
