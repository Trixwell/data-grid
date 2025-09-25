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
      headers.map(h => ({ text: h, bold: true })),
      ...rows.map(row =>
        exportableCols.map(col => {
          const raw = col.callback ? col.callback(row) : row?.[col.name];
          return { text: raw != null ? String(raw) : '' };
        })
      ),
    ];

    this.createPdf({
      content: [
        {
          table: {
            headerRows: 1,
            body,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#ccc',
            vLineColor: () => '#ccc',
            paddingLeft: () => 2,
            paddingRight: () => 2,
            paddingTop: () => 2,
            paddingBottom: () => 2,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 14,
          bold: true,
          margin: [0, 0, 0, 10] as [number, number, number, number],
        },
        tableExample: {
          margin: [0, 5, 0, 15] as [number, number, number, number],
        },
      },
      defaultStyle: { fontSize: 10 },
    })
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
}
