import {Injectable} from '@angular/core';
import {TDocumentDefinitions} from 'pdfmake/interfaces';
import * as pdfMake from 'pdfmake/build/pdfmake';
import * as pdfFonts from 'pdfmake/build/vfs_fonts';
import {GridProperty, GridPropertyType} from '../entity/grid-property';

@Injectable({ providedIn: 'root' })
export class PdfExportService {
  export(rows: any[], columns: GridProperty[], key: string): void {
    const gridData = this.getGridSettings(key);
    const data = gridData ? gridData : columns;
    const exportableCols = data.filter(col => col.type !== GridPropertyType.Actions && col.visible);
    const headers = exportableCols.map(col => col.displayName);

    const body = [
      headers.map(h => ({ text: h, bold: true })),
      ...rows.map(row =>
        exportableCols.map(col => row[col.name])
      ),
    ];

    this.createPdf({
      content: [
        {
          table: {
            headerRows: 1,
            widths: Array(exportableCols.length).fill('*'),
            body,
          },
          layout: {
            hLineWidth: () => 0.5,
            vLineWidth: () => 0.5,
            hLineColor: () => '#ccc',
            vLineColor: () => '#ccc',
            paddingLeft: () => 6,
            paddingRight: () => 6,
            paddingTop: () => 4,
            paddingBottom: () => 4,
          },
        },
      ],
      styles: {
        header: {
          fontSize: 16,
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
