import { checkFilteringQueryV2 } from './CheckFilteringQuery';
import { Context } from 'hono';

describe('checkFilteringQueryV2', () => {
  it('should correctly parse request query parameters into FilteringQueryV2 object', () => {
    const c: Context = {
      req:{
        query: {
          orderKey: 'someOrderKey',
          orderRule: 'asc',
          filters: JSON.stringify({ category: 'electronics' }),
          searchFilters: JSON.stringify({ name: 'phone' }),
          rangedFilters: JSON.stringify([{ field: 'price', min: 100, max: 500 }]),
          rows: '10',
          page: '2',
        },
      }
    } as unknown as Context;

    const expectedFilter = {
      orderKey: 'someOrderKey',
      orderRule: 'asc',
      filters: { category: 'electronics' },
      searchFilters: { name: 'phone' },
      rangedFilters: [{ field: 'price', min: 100, max: 500 }],
      rows: 10,
      page: 2,
    };

    const result = checkFilteringQueryV2(c);

    expect(result).toEqual(expectedFilter);
  });

  it('should correctly handle missing query parameters', () => {
    const c: Context = {
      req:{
        query: {},
      }
    } as Context;

    const expectedFilter = {};

    const result = checkFilteringQueryV2(c);

    expect(result).toEqual(expectedFilter);
  });
});