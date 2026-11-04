import {Type} from '@angular/core';

export class SubGridSettings{
  suburl?:string;
  subTotalsUrl?: string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO;
  autoRefreshIntervalSec?: number | null;
  detailComponent?: Type<any>;
  title?: string | ((row: object) => string | null | undefined);
  summary?: SubGridSummary;
  constructor(params: SubGridPropertiesDTO) {
    this.subUrlParams = params.subUrlParams || null;
    this.subGridProps = params.subGridProps || {};
    this.suburl = params.suburl || '';
    this.subTotalsUrl = params.subTotalsUrl;
    this.detailComponent         = params.detailComponent;
    this.autoRefreshIntervalSec = params.autoRefreshIntervalSec || null;
    this.title = params.title;
    this.summary = params.summary;
  }
}


export interface SubGridPropertiesDTO{
  suburl?:string;
  subTotalsUrl?: string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO
  autoRefreshIntervalSec?: number | null;
  detailComponent?: Type<any>;
  title?: string | ((row: object) => string | null | undefined);
  summary?: SubGridSummary;
}

export interface SubGridSummary {
  url: string;
  filterColumns: string[];
  label?: (values: Record<string, string>) => string;
}

export interface subGridPropsDTO {
  multiselect?: boolean;
  limit?: number;
  sidx?: string;
  search?: boolean;
  showFilters?: boolean
}
