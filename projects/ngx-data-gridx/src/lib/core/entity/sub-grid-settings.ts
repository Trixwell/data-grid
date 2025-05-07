export class SubGridSettings{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO;
  constructor(params: SubGridPropertiesDTO) {
    this.subUrlParams = params.subUrlParams || null;
    this.subGridProps = params.subGridProps || {};
    this.suburl = params.suburl || '';
  }
}


export interface SubGridPropertiesDTO{
  suburl?:string;
  subUrlParams?: { paramName: string; columnName: string }[] | null;
  subGridProps?: subGridPropsDTO
}

export interface subGridPropsDTO {
  multiselect?: boolean;
  limit?: number;
  sidx?: string;
  search?: boolean;
  showFilters?: boolean
}
