import {Injectable} from '@angular/core';
import {Content, StyleDictionary, TDocumentDefinitions} from 'pdfmake/interfaces';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import htmlToPdfmake from 'html-to-pdfmake';
import {GridProperty, GridPropertyType} from '../entity/grid-property';

interface HtmlCellResult {
  content: Content | Content[];
  images?: Record<string, string>;
}

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  private static readonly CELL_STYLES: StyleDictionary = {
    p: { margin: [0, 0, 0, 0] },
    ul: { marginBottom: 0, marginLeft: 8 },
    ol: { marginBottom: 0, marginLeft: 8 },
    table: { marginBottom: 0 },
    h1: { fontSize: 13, bold: true, marginBottom: 0 },
    h2: { fontSize: 12, bold: true, marginBottom: 0 },
    h3: { fontSize: 11, bold: true, marginBottom: 0 },
    h4: { fontSize: 10, bold: true, marginBottom: 0 },
    h5: { fontSize: 10, bold: true, marginBottom: 0 },
    h6: { fontSize: 10, bold: true, marginBottom: 0 },
    a: { color: '#0d6efd', decoration: 'underline' },
  };

  private static readonly HTML_PATTERN =
    /<\/?[a-z][^>]*>|&(?:[a-z][a-z0-9]{1,9}|#\d{1,6}|#x[0-9a-f]{1,6});/i;
  private static readonly IMG_TAG_PATTERN = /<img\b[^>]*>/gi;
  private static readonly IMG_SRC_PATTERN = /\ssrc\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i;

  export(rows: any[], columns: GridProperty[], key: string): void {
    const stored = this.getGridSettings(key);
    const base = stored ?? columns;

    const exportableCols = base
      .filter(c => c.type !== GridPropertyType.Actions && c.visible && !c.component)
      .map(c => {
        const runtime = columns.find(x => x.name === c.name) ?? c;
        return { ...c, callback: (runtime as any).callback } as GridProperty & { callback?: (row: object | null | undefined) => string | undefined };
      });

    if (!exportableCols.length) return;

    const headers = exportableCols.map(c => c.displayName ?? c.name);

    const images: Record<string, string> = {};

    const body: Content[][] = [
      headers.map(h => ({ text: h, bold: true, noWrap: false })),
      ...rows.map(row =>
        exportableCols.map(col => {
          const raw = col.callback ? col.callback(row) : row?.[col.name];

          return this.toCell(raw != null ? String(raw) : '', images);
        })
      ),
    ];

    const widths = Array(exportableCols.length).fill('auto');
    this.createPdf({
      pageMargins: [5, 20, 5, 20],
      ...(Object.keys(images).length ? { images } : {}),
      content: [
        {
          columns: [
            { width: '*', text: '' },
            {
              width: 'auto',
              table: {
                headerRows: 1,
                widths,
                body,
              },
              layout: {
                hLineWidth: () => 0.5,
                vLineWidth: () => 0.5,
                hLineColor: () => '#343A40',
                vLineColor: () => '#343A40',
                paddingLeft: () => 4,
                paddingRight: () => 4,
                paddingTop: () => 3,
                paddingBottom: () => 3,
              },
              margin: [0, 0, 0, 0],
            },
            { width: '*', text: '' },
          ],
          columnGap: 0
        },
      ],
      defaultStyle: { fontSize: 10 },
    });
  }

  createPdf(data: TDocumentDefinitions){
    pdfMake.createPdf(data, undefined, undefined, pdfFonts.vfs).open();
  }

  private toCell(value: string, images: Record<string, string>): Content {
    if (!PdfExportService.HTML_PATTERN.test(value)) return this.textCell(value);

    if (typeof window === 'undefined') return this.textCell(this.stripTags(value));

    try {
      const parsed = htmlToPdfmake(`<div>${this.stripUnsupportedImages(value)}</div>`, {
        imagesByReference: true,
        removeExtraBlanks: true,
        defaultStyles: PdfExportService.CELL_STYLES,
      }) as unknown as HtmlCellResult;

      Object.assign(images, parsed.images ?? {});

      const nodes = Array.isArray(parsed.content) ? parsed.content : [parsed.content];
      const cell: Content = nodes.length === 1 ? nodes[0] : { stack: nodes };

      this.normalizeDeep(cell);

      return cell;
    } catch {
      return this.textCell(this.stripTags(value));
    }
  }

  private textCell(value: string): Content {
    return {
      text: this.shouldBreakAll(value) ? this.breakAll(value, 28) : value,
      noWrap: false,
    };
  }

  private stripUnsupportedImages(html: string): string {
    return html.replace(PdfExportService.IMG_TAG_PATTERN, tag => {
      const match = PdfExportService.IMG_SRC_PATTERN.exec(tag);
      const src = (match?.[1] ?? match?.[2] ?? match?.[3] ?? '').trim();

      if (!src) return '';
      if (/^data:image\/svg/i.test(src)) return '';

      return /\.svg(?:[?#].*)?$/i.test(src) ? '' : tag;
    });
  }

  private stripTags(html: string): string {
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  private toAbsoluteLink(link: string): string | null {
    const raw = link.trim();

    if (!raw) return null;
    if (/^javascript:/i.test(raw)) return null;
    if (/^[a-z][a-z0-9+.-]*:/i.test(raw)) return raw;

    const origin = window.location.origin.replace(/\/+$/, '');
    const path = raw.replace(/^\/+/, '');

    return `${origin}/${path}`;
  }

  private normalizeDeep(node: any): void {
    if (Array.isArray(node)) {
      node.forEach((item, i) => {
        if (typeof item === 'string') {
          if (this.shouldBreakAll(item)) node[i] = this.breakAll(item, 28);
        } else {
          this.normalizeDeep(item);
        }
      });
      return;
    }

    if (!node || typeof node !== 'object') return;

    if (typeof node.link === 'string') {
      const absolute = this.toAbsoluteLink(node.link);

      if (absolute) node.link = absolute;
      else delete node.link;
    }

    if (typeof node.text === 'string') {
      if (this.shouldBreakAll(node.text)) node.text = this.breakAll(node.text, 28);
    } else if (node.text) {
      this.normalizeDeep(node.text);
    }

    for (const key of ['stack', 'ul', 'ol', 'columns']) {
      if (node[key]) this.normalizeDeep(node[key]);
    }

    if (node.table?.body) this.normalizeDeep(node.table.body);
  }

  private getGridSettings(key: string): GridProperty[] | null {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw)?.columns : null;
    } catch {
      return null;
    }
  }

  private breakAll(value: unknown, chunk = 28): string {
    const s = value == null ? '' : String(value);
    return s ? s.replace(new RegExp(`(.{${chunk}})`, 'g'), '$1\u200B') : '';
  }

  private shouldBreakAll(value: unknown, threshold = 35): boolean {
    const s = value == null ? '' : String(value);
    if (s.length < threshold) return false;

    const hasNaturalBreakpoints = /[\s\-_.:,;/\\(){}\[\]]/.test(s);
    return !hasNaturalBreakpoints;
  }
}
