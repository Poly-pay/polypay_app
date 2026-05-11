import type { OpenAPIObject } from '@nestjs/swagger';
import {
  COMMON_ERRORS_SECTION,
  EXAMPLE_FLOWS_SECTION,
  RATE_LIMITS_SECTION,
  WEBSOCKET_EVENTS_SECTION,
} from './llms-txt.content';

type SchemaObject = Record<string, any>;
type OperationObject = Record<string, any>;

interface OperationEntry {
  path: string;
  method: string;
  operation: OperationObject;
}

interface GeneratorOptions {
  apiPrefix: string;
  excludedTags?: string[];
}

const HTTP_METHODS = [
  'get',
  'post',
  'put',
  'patch',
  'delete',
  'options',
  'head',
] as const;

export class LlmsTxtGenerator {
  private readonly basePath: string;
  private readonly excludedTags: Set<string>;

  constructor(
    private readonly doc: OpenAPIObject,
    private readonly options: GeneratorOptions,
  ) {
    this.basePath = options.apiPrefix
      ? `/${options.apiPrefix.replace(/^\/+|\/+$/g, '')}`
      : '';
    this.excludedTags = new Set(options.excludedTags ?? ['admin']);
  }

  generateIndex(): string {
    const lines: string[] = [];
    lines.push(...this.headerLines({ short: true }));
    lines.push('');

    const groups = this.groupByTag();
    for (const [tag, entries] of groups) {
      const tagInfo = this.findTag(tag);
      lines.push(`## ${capitalize(tag)}`);
      if (tagInfo?.description) {
        lines.push('');
        lines.push(tagInfo.description);
      }
      lines.push('');
      for (const entry of entries) {
        lines.push(this.formatBrief(entry));
      }
      lines.push('');
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  generateFull(): string {
    const lines: string[] = [];
    lines.push(...this.headerLines({ short: false }));
    lines.push('');
    lines.push('## Quick start');
    lines.push('');
    lines.push(
      `1. \`POST ${this.basePath}/auth/login\` with ZK proof → returns \`accessToken\` + \`refreshToken\``,
    );
    lines.push(
      '2. Send `Authorization: Bearer <accessToken>` on protected endpoints',
    );
    lines.push(
      `3. On \`401\`, call \`POST ${this.basePath}/auth/refresh\` with \`refreshToken\``,
    );
    lines.push('4. Subscribe Socket.io events for real-time updates');
    lines.push('');
    lines.push('---');
    lines.push('');

    // Cross-cutting reference sections (manual content from llms-txt.content.ts)
    lines.push(COMMON_ERRORS_SECTION);
    lines.push('');
    lines.push(RATE_LIMITS_SECTION);
    lines.push('');
    lines.push(WEBSOCKET_EVENTS_SECTION);
    lines.push('');
    lines.push(EXAMPLE_FLOWS_SECTION);
    lines.push('');
    lines.push('---');
    lines.push('');
    lines.push('# Endpoints');
    lines.push('');

    const groups = this.groupByTag();
    for (const [tag, entries] of groups) {
      const tagInfo = this.findTag(tag);
      lines.push(`## ${capitalize(tag)}`);
      if (tagInfo?.description) {
        lines.push('');
        lines.push(tagInfo.description);
      }
      lines.push('');
      for (const entry of entries) {
        lines.push(this.formatFull(entry));
        lines.push('');
        lines.push('---');
        lines.push('');
      }
    }

    return lines.join('\n').trimEnd() + '\n';
  }

  private headerLines(opts: { short: boolean }): string[] {
    const info = this.doc.info ?? ({} as any);
    const lines: string[] = [];
    lines.push(`# ${info.title ?? 'PolyPay API'}`);
    lines.push('');
    lines.push(
      '> Privacy-preserving multi-chain payroll API. ZK-proof multisig accounts ' +
        'on Horizen and Base, with zkVerify-backed proof verification, JWT auth, ' +
        'real-time WebSocket events, and an x402-compliant gasless USDC deposit ' +
        'endpoint designed for AI agents and human users alike.',
    );
    lines.push('');
    lines.push('Supported destination chains for multisig accounts:');
    lines.push('');
    lines.push(
      '- **Horizen** (mainnet `26514`, testnet `2651420`) — EVM L3, ZK-native',
    );
    lines.push(
      '- **Base** (mainnet `8453`, Sepolia `84532`) — EVM L2, USDC-native, x402 deposit available',
    );
    lines.push('');
    lines.push(
      'All paths below are relative to the host that served this file.',
    );
    lines.push('');
    lines.push(`- **Base path**: \`${this.basePath || '/'}\``);
    lines.push(`- **Version**: ${info.version ?? 'unknown'}`);
    lines.push(
      '- **Auth**: JWT Bearer token (`Authorization: Bearer <token>`)',
    );
    lines.push(
      `- **Get token**: \`POST ${this.basePath}/auth/login\` (ZK proof, verified via zkVerify)`,
    );
    lines.push(`- **Refresh**: \`POST ${this.basePath}/auth/refresh\``);
    lines.push(`- **OpenAPI spec**: \`${this.basePath}/swagger-json\``);
    lines.push(`- **Interactive docs**: \`${this.basePath}/swagger\``);
    lines.push('- **Project docs**: https://q3labs.gitbook.io/polypay');
    if (opts.short) {
      lines.push('- **Full reference**: `/llms-full.txt`');
    } else {
      lines.push('- **Index**: `/llms.txt`');
    }
    return lines;
  }

  private findTag(name: string) {
    return (this.doc.tags ?? []).find((t) => t.name === name);
  }

  private groupByTag(): Map<string, OperationEntry[]> {
    const groups = new Map<string, OperationEntry[]>();
    const paths = this.doc.paths ?? {};

    for (const [rawPath, pathItem] of Object.entries(paths)) {
      if (!pathItem) continue;
      for (const method of HTTP_METHODS) {
        const op = (pathItem as any)[method] as OperationObject | undefined;
        if (!op) continue;
        const tags: string[] = op.tags?.length ? op.tags : ['untagged'];
        if (tags.some((t) => this.excludedTags.has(t))) continue;

        // NestJS Swagger already prepends the global prefix into paths,
        // so we use the raw path as-is to avoid double-prefixing.
        const entry: OperationEntry = {
          path: rawPath.startsWith('/') ? rawPath : `/${rawPath}`,
          method: method.toUpperCase(),
          operation: op,
        };
        const tag = tags[0];
        if (!groups.has(tag)) groups.set(tag, []);
        groups.get(tag)!.push(entry);
      }
    }

    for (const entries of groups.values()) {
      entries.sort(
        (a, b) =>
          a.path.localeCompare(b.path) || a.method.localeCompare(b.method),
      );
    }

    return new Map(
      [...groups.entries()].sort((a, b) => a[0].localeCompare(b[0])),
    );
  }

  private formatBrief(entry: OperationEntry): string {
    const summary =
      entry.operation.summary ?? entry.operation.operationId ?? '';
    return summary
      ? `- \`${entry.method} ${entry.path}\` — ${summary}`
      : `- \`${entry.method} ${entry.path}\``;
  }

  private formatFull(entry: OperationEntry): string {
    const op = entry.operation;
    const lines: string[] = [];
    lines.push(`### ${entry.method} ${entry.path}`);
    lines.push('');
    if (op.summary) {
      lines.push(`**${op.summary}**`);
      lines.push('');
    }
    if (op.description && op.description !== op.summary) {
      lines.push(op.description);
      lines.push('');
    }

    const auth = op.security?.length
      ? 'JWT Bearer (required)'
      : 'Public (no auth)';
    lines.push(`- Auth: ${auth}`);
    if (op.deprecated) {
      lines.push('- Status: **DEPRECATED**');
    }
    lines.push('');

    const params = (op.parameters ?? []) as any[];
    if (params.length) {
      lines.push('**Parameters**');
      lines.push('');
      lines.push('| Name | In | Required | Type | Description |');
      lines.push('|---|---|---|---|---|');
      for (const p of params) {
        const type = this.schemaTypeName(p.schema);
        lines.push(
          `| \`${p.name}\` | ${p.in} | ${p.required ? 'yes' : 'no'} | ${type} | ${escapeCell(p.description ?? '')} |`,
        );
      }
      lines.push('');
    }

    if (op.requestBody) {
      const body = op.requestBody;
      const content = body.content ?? {};
      const json = content['application/json'];
      if (json?.schema || body.description) {
        lines.push('**Request body** (`application/json`)');
        lines.push('');
        if (body.description) {
          lines.push(body.description);
          lines.push('');
        }
        if (json?.schema) {
          const fields = this.formatSchemaTable(json.schema);
          if (fields) {
            lines.push(fields);
            lines.push('');
          }
        }
        const examples = json?.examples;
        if (examples && Object.keys(examples).length) {
          for (const [name, ex] of Object.entries(examples) as [
            string,
            any,
          ][]) {
            lines.push(`Example — *${ex.summary ?? name}*:`);
            lines.push('');
            lines.push('```json');
            lines.push(JSON.stringify(ex.value, null, 2));
            lines.push('```');
            lines.push('');
          }
        } else if (json?.example) {
          lines.push('Example:');
          lines.push('');
          lines.push('```json');
          lines.push(JSON.stringify(json.example, null, 2));
          lines.push('```');
          lines.push('');
        }
      }
    }

    const responses = op.responses ?? {};
    if (Object.keys(responses).length) {
      lines.push('**Responses**');
      lines.push('');
      for (const [status, resp] of Object.entries(responses) as [
        string,
        any,
      ][]) {
        const desc = resp.description ?? '';
        lines.push(`- \`${status}\` — ${desc}`);
        const json = resp.content?.['application/json'];
        if (json?.example !== undefined) {
          lines.push('');
          lines.push('  ```json');
          const exampleStr = JSON.stringify(json.example, null, 2);
          for (const l of exampleStr.split('\n')) lines.push(`  ${l}`);
          lines.push('  ```');
        } else if (json?.schema) {
          const compact = this.formatSchemaInline(json.schema);
          if (compact) lines.push(`  Shape: ${compact}`);
        }
      }
    }

    return lines.join('\n');
  }

  private formatSchemaTable(schema: SchemaObject): string {
    const resolved = this.resolveSchema(schema);
    if (!resolved || resolved.type !== 'object' || !resolved.properties) {
      const inline = this.formatSchemaInline(schema);
      return inline ? `Shape: ${inline}` : '';
    }
    const required = new Set<string>(resolved.required ?? []);
    const lines: string[] = [];
    lines.push('| Field | Type | Required | Description |');
    lines.push('|---|---|---|---|');
    for (const [name, propRaw] of Object.entries(resolved.properties)) {
      const prop = this.resolveSchema(propRaw as SchemaObject) ?? {};
      const type = this.schemaTypeName(propRaw as SchemaObject);
      const desc = (
        prop.description ??
        (propRaw as any).description ??
        ''
      ).toString();
      lines.push(
        `| \`${name}\` | ${type} | ${required.has(name) ? 'yes' : 'no'} | ${escapeCell(desc)} |`,
      );
    }
    return lines.join('\n');
  }

  private formatSchemaInline(schema: SchemaObject): string {
    const resolved = this.resolveSchema(schema);
    if (!resolved) return '';
    if (resolved.type === 'array') {
      const itemType = this.schemaTypeName(resolved.items ?? {});
      return `${itemType}[]`;
    }
    if (resolved.type === 'object' && resolved.properties) {
      const fields = Object.entries(resolved.properties)
        .slice(0, 6)
        .map(([k, v]) => `${k}: ${this.schemaTypeName(v as SchemaObject)}`)
        .join(', ');
      const more = Object.keys(resolved.properties).length > 6 ? ', ...' : '';
      return `{ ${fields}${more} }`;
    }
    return this.schemaTypeName(schema);
  }

  private schemaTypeName(schema: SchemaObject | undefined): string {
    if (!schema) return 'any';
    if (schema.$ref) {
      const name = schema.$ref.split('/').pop();
      return name ?? 'object';
    }
    if (schema.type === 'array') {
      return `${this.schemaTypeName(schema.items)}[]`;
    }
    if (schema.enum) {
      return schema.enum.map((v: unknown) => JSON.stringify(v)).join(' | ');
    }
    if (schema.type) {
      return schema.format ? `${schema.type} (${schema.format})` : schema.type;
    }
    if (schema.oneOf || schema.anyOf) {
      const variants = (schema.oneOf ?? schema.anyOf).map((s: SchemaObject) =>
        this.schemaTypeName(s),
      );
      return variants.join(' | ');
    }
    return 'any';
  }

  private resolveSchema(schema: SchemaObject | undefined): SchemaObject | null {
    if (!schema) return null;
    if (!schema.$ref) return schema;
    const name = schema.$ref.split('/').pop();
    if (!name) return null;
    const target = this.doc.components?.schemas?.[name] as
      | SchemaObject
      | undefined;
    return target ?? null;
  }
}

function capitalize(s: string): string {
  if (!s) return s;
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function escapeCell(s: string): string {
  return s.replace(/\|/g, '\\|').replace(/\n/g, ' ').trim();
}
