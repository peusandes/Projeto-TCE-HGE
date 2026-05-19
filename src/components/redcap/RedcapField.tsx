"use client";

import { Calculator, Info, BookOpen, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { FieldDef, FieldValue, FormContext } from "@/lib/redcap-schema/types";

const FIELD_INPUT =
  "bg-paper-soft border-hairline focus-visible:border-cobalt focus-visible:ring-0 text-ink placeholder:text-ash";

type Props = {
  field: FieldDef;
  value: FieldValue;
  onChange: (next: FieldValue) => void;
  ctx: FormContext;
};

export function RedcapField({ field, value, onChange, ctx }: Props) {
  // Descriptive: section header or info block (no input)
  if (field.type === "descriptive") {
    if (field.section === "header") {
      return (
        <div className="pt-3 pb-1">
          <div className="flex items-center justify-between gap-3">
            <h3 className="text-[11px] uppercase tracking-editorial text-cobalt-soft font-semibold">
              {field.label}
            </h3>
            {field.helpUrl && (
              <a
                href={field.helpUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 rounded-md border border-cobalt/30 bg-cobalt/[0.06] px-2 py-1 text-[10px] uppercase tracking-editorial text-cobalt-soft hover:bg-cobalt/[0.12] transition-colors"
              >
                <BookOpen className="h-3 w-3" strokeWidth={2} />
                Como fazer
                <ExternalLink className="h-2.5 w-2.5 opacity-70" strokeWidth={2} />
              </a>
            )}
          </div>
          <div className="h-px bg-hairline mt-2" />
        </div>
      );
    }
    const content = typeof field.content === "function" ? field.content(ctx) : field.content ?? "";
    return (
      <div className="rounded-lg border border-hairline bg-paper-soft p-3 text-[12px] text-graphite leading-relaxed whitespace-pre-line">
        {content}
      </div>
    );
  }

  // Calculated — readonly
  if (field.type === "calc") {
    const computed = field.calc?.(ctx) ?? null;
    const display = computed === null || computed === undefined ? "—" : `${computed}${field.calcUnit ? " " + field.calcUnit : ""}`;
    return (
      <div className="space-y-1.5">
        <FieldLabel field={field} calculated />
        <div className="flex h-11 items-center rounded-md border border-cobalt/20 bg-cobalt/[0.06] px-3 text-[14px] text-ink font-medium tab-num">
          {display}
        </div>
        {field.calcLabel && (
          <p className="text-[10px] text-ash italic">{field.calcLabel}</p>
        )}
      </div>
    );
  }

  // Yes/No — two large buttons
  if (field.type === "yesno") {
    const v = value === 1 || value === "1" ? 1 : value === 0 || value === "0" ? 0 : null;
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => onChange(v === 1 ? null : 1)}
            className={cn(
              "min-tap h-12 rounded-lg border text-[14px] font-medium transition-colors",
              v === 1
                ? "border-moss bg-moss/15 text-moss"
                : "border-hairline bg-paper-soft text-graphite hover:border-moss/40",
            )}
          >
            Sim
          </button>
          <button
            type="button"
            onClick={() => onChange(v === 0 ? null : 0)}
            className={cn(
              "min-tap h-12 rounded-lg border text-[14px] font-medium transition-colors",
              v === 0
                ? "border-vermillion bg-vermillion/15 text-vermillion"
                : "border-hairline bg-paper-soft text-graphite hover:border-vermillion/40",
            )}
          >
            Não
          </button>
        </div>
        <FieldFooter field={field} />
      </div>
    );
  }

  // Radio — vertical list
  if (field.type === "radio") {
    const choices = field.choices ?? [];
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <div className="space-y-1.5">
          {choices.map((c) => {
            const selected = value === c.value;
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => onChange(selected ? null : c.value)}
                className={cn(
                  "w-full min-tap flex items-center gap-3 px-3 py-2.5 rounded-lg border text-left text-[13.5px] transition-colors",
                  selected
                    ? "border-cobalt bg-cobalt/10 text-ink"
                    : "border-hairline bg-paper-soft text-graphite hover:border-cobalt/40",
                )}
              >
                <span
                  className={cn(
                    "inline-block size-4 rounded-full border-2 shrink-0",
                    selected ? "border-cobalt bg-cobalt" : "border-hairline",
                  )}
                />
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
        <FieldFooter field={field} />
      </div>
    );
  }

  // Dropdown
  if (field.type === "dropdown") {
    const choices = field.choices ?? [];
    const v = value === null || value === undefined ? "" : String(value);
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <Select
          value={v}
          onValueChange={(s) => onChange(s === "" ? null : Number(s))}
        >
          <SelectTrigger className={FIELD_INPUT}>
            <SelectValue placeholder="Selecione..." />
          </SelectTrigger>
          <SelectContent>
            {choices.map((c) => (
              <SelectItem key={c.value} value={String(c.value)}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <FieldFooter field={field} />
      </div>
    );
  }

  // Checkbox multi
  if (field.type === "checkbox") {
    const choices = field.choices ?? [];
    const arr = Array.isArray(value) ? value : [];
    const toggle = (val: number) => {
      const has = arr.includes(val);
      const next = has ? arr.filter((v) => v !== val) : [...arr, val].sort((a, b) => a - b);
      onChange(next.length ? next : null);
    };
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <div className="space-y-1.5">
          {choices.map((c) => {
            const selected = arr.includes(c.value);
            return (
              <button
                key={c.value}
                type="button"
                onClick={() => toggle(c.value)}
                className={cn(
                  "w-full min-tap flex items-center gap-3 px-3 py-2 rounded-lg border text-left text-[13.5px] transition-colors",
                  selected
                    ? "border-cobalt bg-cobalt/10 text-ink"
                    : "border-hairline bg-paper-soft text-graphite hover:border-cobalt/40",
                )}
              >
                <span
                  className={cn(
                    "inline-flex size-4 rounded border-2 shrink-0 items-center justify-center",
                    selected ? "border-cobalt bg-cobalt" : "border-hairline",
                  )}
                >
                  {selected && (
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </span>
                <span>{c.label}</span>
              </button>
            );
          })}
        </div>
        {arr.length > 0 && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="text-[11px] text-ash hover:text-vermillion uppercase tracking-editorial"
          >
            Limpar seleção
          </button>
        )}
        <FieldFooter field={field} />
      </div>
    );
  }

  // Number
  if (field.type === "number") {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <div className="relative">
          <Input
            type="number"
            inputMode="decimal"
            min={field.min}
            max={field.max}
            step={field.integer ? 1 : "any"}
            value={value === null || value === undefined ? "" : String(value)}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "") {
                onChange(null);
                return;
              }
              const n = Number(v);
              onChange(Number.isFinite(n) ? n : null);
            }}
            className={cn(FIELD_INPUT, field.unit && "pr-12")}
            placeholder={field.placeholder}
          />
          {field.unit && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] text-ash">
              {field.unit}
            </span>
          )}
        </div>
        <FieldFooter field={field} />
      </div>
    );
  }

  // Date — date_dmy
  if (field.type === "date") {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <Input
          type="date"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={FIELD_INPUT}
        />
        <FieldFooter field={field} />
      </div>
    );
  }

  // DateTime — datetime_dmy
  if (field.type === "datetime") {
    return (
      <div className="space-y-2">
        <FieldLabel field={field} />
        <Input
          type="datetime-local"
          value={typeof value === "string" ? value : ""}
          onChange={(e) => onChange(e.target.value || null)}
          className={FIELD_INPUT}
        />
        <FieldFooter field={field} />
      </div>
    );
  }

  // Text (default)
  return (
    <div className="space-y-2">
      <FieldLabel field={field} />
      <Input
        type="text"
        value={typeof value === "string" || typeof value === "number" ? String(value) : ""}
        onChange={(e) => onChange(e.target.value || null)}
        placeholder={field.placeholder}
        className={FIELD_INPUT}
      />
      <FieldFooter field={field} />
    </div>
  );
}

function FieldLabel({ field, calculated = false }: { field: FieldDef; calculated?: boolean }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <label className="text-[12px] font-medium text-graphite leading-tight">
        {field.label}
        {field.required && <span className="ml-0.5 text-vermillion">*</span>}
      </label>
      {calculated && (
        <span className="inline-flex items-center gap-1 text-[9px] uppercase tracking-editorial text-cobalt-soft">
          <Calculator className="h-3 w-3" strokeWidth={1.8} />
          calculado
        </span>
      )}
    </div>
  );
}

function FieldFooter({ field }: { field: FieldDef }) {
  if (!field.note) return null;
  return (
    <p className="text-[11px] text-ash italic flex items-start gap-1.5 leading-snug">
      <Info className="h-3 w-3 mt-0.5 shrink-0" strokeWidth={1.8} />
      {field.note}
    </p>
  );
}
