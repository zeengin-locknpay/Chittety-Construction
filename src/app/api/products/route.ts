import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  
  const category = searchParams.get('category') || '';
  const subcategory = searchParams.get('subcategory') || '';
  const brand = searchParams.get('brand') || '';
  const minPrice = searchParams.get('minPrice') ? parseFloat(searchParams.get('minPrice')!) : 0;
  const maxPrice = searchParams.get('maxPrice') ? parseFloat(searchParams.get('maxPrice')!) : Infinity;
  const search = searchParams.get('search') || '';
  const page = parseInt(searchParams.get('page') || '1');
  const limit = parseInt(searchParams.get('limit') || '24');
  const sort = searchParams.get('sort') || 'sku';
  const codePrefix = searchParams.get('codePrefix') || '';

  const where: any = {};
  if (category) where.category = category;
  if (subcategory) where.subcategory = subcategory;
  if (brand) where.brand = brand;
  if (codePrefix) where.codePrefix = codePrefix;
  if (minPrice > 0 || maxPrice < Infinity) {
    where.marketPrice = { gte: minPrice };
    if (maxPrice < Infinity) where.marketPrice = { gte: minPrice, lte: maxPrice };
  }
  if (search) {
    where.OR = [
      { name: { contains: search } },
      { sku: { contains: search } },
      { brand: { contains: search } },
      { category: { contains: search } },
    ];
  }

  const skip = (page - 1) * limit;
  
  let orderBy: any = { sku: 'asc' };
  if (sort === 'price-asc') orderBy = { marketPrice: 'asc' };
  else if (sort === 'price-desc') orderBy = { marketPrice: 'desc' };
  else if (sort === 'name') orderBy = { name: 'asc' };

  const [products, total] = await Promise.all([
    db.product.findMany({
      where,
      orderBy,
      skip,
      take: limit,
    }),
    db.product.count({ where }),
  ]);

  const [categories, brands, subcategories] = await Promise.all([
    db.product.findMany({ distinct: ['category'], select: { category: true }, orderBy: { category: 'asc' } }),
    db.product.findMany({ distinct: ['brand'], select: { brand: true }, orderBy: { brand: 'asc' } }),
    db.product.findMany({ distinct: ['subcategory'], select: { subcategory: true }, orderBy: { subcategory: 'asc' } }),
  ]);

  return NextResponse.json({
    products,
    total,
    page,
    totalPages: Math.ceil(total / limit),
    filters: {
      categories: categories.map(c => c.category),
      brands: brands.map(b => b.brand).filter(Boolean),
      subcategories: subcategories.map(s => s.subcategory).filter(Boolean),
    }
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      category,
      subcategory,
      brand,
      productType,
      specification,
      unit,
      moq,
      marketPrice,
      discount,
      chittetyPrice,
      availability,
      priceBasis,
      shortDescription,
      codePrefix,
    } = body;

    if (!sku || !name || !category) {
      return NextResponse.json({ error: 'SKU, name, and category are required' }, { status: 400 });
    }

    if (marketPrice === undefined || chittetyPrice === undefined) {
      return NextResponse.json({ error: 'Market price and Chittety price are required' }, { status: 400 });
    }

    // Check if SKU already exists
    const existing = await db.product.findUnique({
      where: { sku: sku.trim() },
    });
    if (existing) {
      return NextResponse.json({ error: 'Product with this SKU already exists' }, { status: 400 });
    }

    const product = await db.product.create({
      data: {
        sku: sku.trim(),
        name: name.trim(),
        category: category.trim(),
        subcategory: (subcategory || '').trim(),
        brand: (brand || '').trim(),
        productType: (productType || '').trim(),
        specification: (specification || '').trim(),
        unit: (unit || 'Each').trim(),
        moq: moq !== undefined ? Number(moq) : 1,
        marketPrice: Number(marketPrice),
        discount: discount !== undefined ? Number(discount) : 0.1,
        chittetyPrice: Number(chittetyPrice),
        availability: (availability || 'Vendor Available / Confirm Stock').trim(),
        priceBasis: (priceBasis || 'Market reference').trim(),
        shortDescription: (shortDescription || '').trim(),
        codePrefix: (codePrefix || '').trim(),
      },
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Product creation error:', error);
    return NextResponse.json({ error: 'Failed to create product' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const {
      sku,
      name,
      category,
      subcategory,
      brand,
      productType,
      specification,
      unit,
      moq,
      marketPrice,
      discount,
      chittetyPrice,
      availability,
      priceBasis,
      shortDescription,
      codePrefix,
    } = body;

    if (!sku) {
      return NextResponse.json({ error: 'SKU is required' }, { status: 400 });
    }

    const existing = await db.product.findUnique({
      where: { sku: sku.trim() },
    });
    if (!existing) {
      return NextResponse.json({ error: 'Product not found' }, { status: 404 });
    }

    const data: any = {};
    if (name !== undefined) data.name = name.trim();
    if (category !== undefined) data.category = category.trim();
    if (subcategory !== undefined) data.subcategory = subcategory.trim();
    if (brand !== undefined) data.brand = brand.trim();
    if (productType !== undefined) data.productType = productType.trim();
    if (specification !== undefined) data.specification = specification.trim();
    if (unit !== undefined) data.unit = unit.trim();
    if (moq !== undefined) data.moq = Number(moq);
    if (marketPrice !== undefined) data.marketPrice = Number(marketPrice);
    if (discount !== undefined) data.discount = Number(discount);
    if (chittetyPrice !== undefined) data.chittetyPrice = Number(chittetyPrice);
    if (availability !== undefined) data.availability = availability.trim();
    if (priceBasis !== undefined) data.priceBasis = priceBasis.trim();
    if (shortDescription !== undefined) data.shortDescription = shortDescription.trim();
    if (codePrefix !== undefined) data.codePrefix = codePrefix.trim();

    const product = await db.product.update({
      where: { sku: sku.trim() },
      data,
    });

    return NextResponse.json({ success: true, product });
  } catch (error) {
    console.error('Product update error:', error);
    return NextResponse.json({ error: 'Failed to update product' }, { status: 500 });
  }
}
