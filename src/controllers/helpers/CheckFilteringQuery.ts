import { FilteringQueryV2, RangedFilter } from "$entities/Query";

import { Context } from "hono";

/*

Legacy V1 Above 

Please use V2 :)

*/

export function checkFilteringQueryV2(c:Context): FilteringQueryV2 {

  let filter: FilteringQueryV2 = {};

  const queries = {
    orderKey : c.req.query("orderKey"),
    orderRule : c.req.query("orderRule"),
    filters : c.req.query("filters"),
    searchFilters : c.req.query("searchFilters"),
    rangedFilters : c.req.query("rangedFilters"),
    rows: c.req.query("rows"),
    page: c.req.query("page")
  }

  if (queries.orderKey) {
    filter.orderKey = queries.orderKey.toString()
  }
  if (queries.orderRule) {
    filter.orderRule=queries.orderRule.toString()
  }
  if (queries.filters) {
    filter.filters = JSON.parse(queries.filters.toString()) as  Record<string, any | any[] | null>
  }

  if (queries.searchFilters) {
    filter.searchFilters= JSON.parse(queries.searchFilters.toString()) as  Record<string, any | any[] | null>
  }

  if (queries.rangedFilters) {
    filter.rangedFilters= JSON.parse(queries.rangedFilters.toString()) as RangedFilter[]
  }
  
  if (queries.rows) {
    filter = {
      ...filter,
      // page: Number(queries.page),
      rows: Number(queries.rows),
    };
  }

  if (queries.page){
    filter={
        ...filter,
        page: Number(queries.page)
    }
  }

  return filter;
}

