import {SubGridSettings} from './sub-grid-settings';
import {Observable, Subscription} from 'rxjs';

export class GridProperty{
  name: string;
  displayName: string;
  type: GridPropertyType;
  search?: boolean;
  width?: string;
  filter?: {
    label: string;
    type: "multi-search" | "text" | "checkbox" | "select" | "multi-select" | "date" | "input";
    dateOptions?:{
      range: boolean;
    }
    multiSearchOptions?:{
      url:string;
      id: string;
      label:string;
    }
    callback?: (columnName: string, filterType: string, value: (string | number | string[])) => void
  }[] | undefined;
  filterValues?: { label: string; value: string; selected?:false }[][];
  sort?: boolean;
  classes?: string;
  style_formatter?: (value: string | number | undefined | object, index: number) => string;
  actions?: { icon: string; visible?: (row: object | null | undefined) => boolean; tooltip: string; customHtml?: (row: object | null | undefined) => string; action?: (row: object | null | undefined) => void | Subscription | Promise<void> | Observable<void> }[];
  ident?: boolean = false;
  subGridPropertyList: GridProperty[] | null = null;
  subGridSettings: SubGridSettings | null  = null;
  callback?: (row: object | null | undefined) => string | undefined;
  columnSortIndex?: string;
  constructor(params: GridPropertiesDTO) {
    this.name = params.name;
    this.displayName = params.displayName;
    this.type = params.type;
    this.search = params.search || false;
    this.width = params.width || "auto";
    this.filter = params.filter;
    this.sort = params.sort || false;
    this.classes = params.classes || "";
    this.style_formatter = params.style_formatter;
    this.filterValues = params.filterValues;
    this.actions = params.actions || [];
    this.ident = params.ident || false;
    this.subGridPropertyList = params.subGridPropertyList || null;
    this.subGridSettings = params.subGridSettings || null;
    this.callback = params.callback || undefined;
    this.columnSortIndex = params.columnSortIndex || '';

    this.setDateOptionsByDefault(params);
  }

  setDateOptionsByDefault(params: GridPropertiesDTO){
    this.filter = (params.filter || []).map(f => {
      const rangeValue = f.dateOptions?.range ?? true;

      return {
        label: f.label,
        type: f.type,
        callback: f.callback,
        multiSearchOptions: f.multiSearchOptions,
        dateOptions: { range: rangeValue }
      };
    });
  }
}
//grid property ident(settings)
export enum GridPropertyType {
  Text = "text",
  Number = "number",
  Select = "select",
  Checkbox = "checkbox",
  Hidden = "hidden",
  Select2 = "select2",
  Actions = "actions",
  Date    = 'date',
  Audio   = 'audio'
}

export interface GridPropertiesDTO{
  name: string;
  displayName: string;
  type: GridPropertyType;
  search?: boolean;
  width?: string;
  filter?: {
    label: string;
    type: "multi-search" | "text" | "checkbox" | "select" | "multi-select" | "date" | "input";
    callback?: (columnName: string, filterType: string, value: string | number | string[]) => void;
    dateOptions?:{
      range: boolean;
    },
    multiSearchOptions?:{
      url:string;
      id: string;
      label:string;
    }
  }[];
  filterValues?: { label: string; value: string, selected?:false }[][];
  sort?: boolean;
  classes?: string;
  callback?: (row: object | null | undefined) => string | undefined;
  style_formatter?: (value: string | number | undefined | object, index:number) => string;
  select?:false,
  actions?: { icon: string; visible?: (row: object | null | undefined) => boolean; tooltip: string; customHtml?: (row: object | null | undefined) => string; action?: (row: object | null | undefined) => void | Subscription | Promise<void> | Observable<void> }[];
  subGridPropertyList?: GridProperty[] | null;
  ident?: boolean;
  subGridSettings?: SubGridSettings | null;
  columnSortIndex?: string;
}
