import {Injectable} from '@angular/core';
import {TDocumentDefinitions} from 'pdfmake/interfaces';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import {GridProperty, GridPropertyType} from '../entity/grid-property';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
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

    const body = [
      headers.map(h => ({ text: h, bold: true, noWrap: false })),
      ...rows.map(row =>
        exportableCols.map(col => {
          const raw = col.callback ? col.callback(row) : row?.[col.name];
          const text = raw != null ? String(raw) : '';

          return {
            text: this.shouldBreakAll(text) ? this.breakAll(text, 28) : text,
            noWrap: false,
          };
        })
      ),
    ];

    const widths = Array(exportableCols.length).fill('auto');
    this.createPdf({
      pageMargins: [5, 20, 5, 20],
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
