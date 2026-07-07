'use client';

import { useEffect, useState, useCallback } from 'react';
import { Search, X, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';

interface Product {
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  productType: string;
  specification: string;
  unit: string;
  moq: number;
  marketPrice: number;
  discount: number;
  chittetyPrice: number;
  availability: string;
  priceBasis: string;
  shortDescription: string;
  codePrefix: string;
}

interface ProductFormState {
  sku: string;
  name: string;
  category: string;
  subcategory: string;
  brand: string;
  productType: string;
  specification: string;
  unit: string;
  moq: number;
  marketPrice: number;
  discount: number;
  chittetyPrice: number;
  availability: string;
  priceBasis: string;
  shortDescription: string;
  codePrefix: string;
}

const initialFormState: ProductFormState = {
  sku: '',
  name: '',
  category: '',
  subcategory: '',
  brand: '',
  productType: '',
  specification: '',
  unit: 'Each',
  moq: 1,
  marketPrice: 0,
  discount: 0.1,
  chittetyPrice: 0,
  availability: 'Vendor Available / Confirm Stock',
  priceBasis: 'Market reference',
  shortDescription: '',
  codePrefix: '',
};

export default function AdminProducts() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalPages, setTotalPages] = useState(1);

  // Filter suggestion list states
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [subcategories, setSubcategories] = useState<string[]>([]);

  // Dialog & Form states
  const [isOpen, setIsOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formState, setFormState] = useState<ProductFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { toast } = useToast();

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', '25');

      const res = await fetch(`/api/products?${params.toString()}`);
      const data = await res.json();

      setProducts(data.products || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);

      if (data.filters) {
        setCategories(data.filters.categories || []);
        setBrands(data.filters.brands || []);
        setSubcategories(data.filters.subcategories || []);
      }
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchProducts();
  };

  const getCategoryShort = (category: string) => {
    const map: Record<string, string> = {
      'Plumbing, Bathroom & Sewer': 'Plumbing',
      'Electrical, Wiring & Panels': 'Electrical',
      'Lighting, HVAC, Pumps & Water Heaters': 'Lighting/HVAC',
      'Flooring, Roofing & Building Materials': 'Flooring/Building',
      'Hardware, Steel, Tools, Safety & Kitchen': 'Hardware/Steel',
    };
    return map[category] || category;
  };

  const handleNumberChange = (field: keyof ProductFormState, val: string) => {
    const parsed = val === '' ? 0 : parseFloat(val);
    setFormState(prev => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleIntChange = (field: keyof ProductFormState, val: string) => {
    const parsed = val === '' ? 0 : parseInt(val, 10);
    setFormState(prev => ({
      ...prev,
      [field]: isNaN(parsed) ? 0 : parsed
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.sku.trim() || !formState.name.trim() || !formState.category.trim()) {
      toast({
        title: 'Validation Error',
        description: 'SKU, name, and category are required.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const url = '/api/products';
      const method = isEditing ? 'PATCH' : 'POST';
      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formState),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save product');
      }

      toast({
        title: isEditing ? 'Product Updated' : 'Product Created',
        description: `Successfully ${isEditing ? 'updated' : 'created'} product ${formState.sku}.`,
      });

      setIsOpen(false);
      fetchProducts();
    } catch (err: any) {
      toast({
        title: 'Error',
        description: err.message || 'An error occurred while saving the product.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">Products</h1>
          <p className="text-sm text-[#6B7280] mt-1">{total.toLocaleString()} products in catalog</p>
        </div>

        {/* Search & Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={handleSearch} className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-[#9CA3AF]" />
              <Input
                placeholder="Search by name, SKU, brand..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 w-64 h-9 text-sm"
              />
            </div>
            <Button type="submit" size="sm" className="h-9 bg-[#111827] hover:bg-[#111827]/90 text-white font-medium">
              Search
            </Button>
            {search && (
              <Button type="button" variant="ghost" size="sm" onClick={() => { setSearch(''); setPage(1); }}>
                <X className="size-3.5" />
              </Button>
            )}
          </form>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              setIsEditing(false);
              setFormState(initialFormState);
              setIsOpen(true);
            }}
            className="h-9 bg-[#111827] hover:bg-[#111827]/90 text-white font-medium flex items-center gap-1.5"
          >
            <Plus className="size-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-lg border border-[#E5E7EB] bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F9FAFB]">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">SKU</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Product Name</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden lg:table-cell">Category</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden xl:table-cell">Brand</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden xl:table-cell">Spec</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Chittety Price</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider hidden md:table-cell">Status</th>
                <th className="text-center px-4 py-2.5 text-xs font-semibold text-[#6B7280] uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="px-4 py-3"><div className="h-3 w-16 bg-[#F3F4F6] rounded" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-40 bg-[#F3F4F6] rounded" /></td>
                    <td className="px-4 py-3 hidden lg:table-cell"><div className="h-3 w-20 bg-[#F3F4F6] rounded" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><div className="h-3 w-16 bg-[#F3F4F6] rounded" /></td>
                    <td className="px-4 py-3 hidden xl:table-cell"><div className="h-3 w-20 bg-[#F3F4F6] rounded" /></td>
                    <td className="px-4 py-3 text-right"><div className="h-3 w-14 bg-[#F3F4F6] rounded ml-auto" /></td>
                    <td className="px-4 py-3 hidden md:table-cell"><div className="h-3 w-16 bg-[#F3F4F6] rounded mx-auto" /></td>
                    <td className="px-4 py-3"><div className="h-3 w-6 bg-[#F3F4F6] rounded mx-auto" /></td>
                  </tr>
                ))
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-[#6B7280]">No products found</td>
                </tr>
              ) : (
                products.map((p) => {
                  const isAvailable = p.availability && !p.availability.toLowerCase().includes('out of stock') && !p.availability.toLowerCase().includes('discontinued');
                  return (
                    <tr key={p.sku} className="hover:bg-[#F9FAFB] transition-colors">
                      <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">{p.sku}</td>
                      <td className="px-4 py-3 font-medium text-[#111827] max-w-[200px] truncate">{p.name}</td>
                      <td className="px-4 py-3 text-[#6B7280] hidden lg:table-cell">{getCategoryShort(p.category)}</td>
                      <td className="px-4 py-3 text-[#6B7280] hidden xl:table-cell">{p.brand}</td>
                      <td className="px-4 py-3 text-[#6B7280] hidden xl:table-cell max-w-[150px] truncate">{p.specification}</td>
                      <td className="px-4 py-3 text-right font-semibold text-[#111827]">${p.chittetyPrice.toFixed(2)}</td>
                      <td className="px-4 py-3 text-center hidden md:table-cell">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            isAvailable
                              ? 'border-emerald-200 text-emerald-700 bg-emerald-50'
                              : 'border-amber-200 text-amber-700 bg-amber-50'
                          }`}
                        >
                          {isAvailable ? 'Available' : 'Confirm'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0 hover:bg-[#F3F4F6]"
                          onClick={() => {
                            setIsEditing(true);
                            setFormState({
                              sku: p.sku,
                              name: p.name || '',
                              category: p.category || '',
                              subcategory: p.subcategory || '',
                              brand: p.brand || '',
                              productType: p.productType || '',
                              specification: p.specification || '',
                              unit: p.unit || 'Each',
                              moq: p.moq !== undefined ? p.moq : 1,
                              marketPrice: p.marketPrice || 0,
                              discount: p.discount !== undefined ? p.discount : 0.1,
                              chittetyPrice: p.chittetyPrice || 0,
                              availability: p.availability || 'Vendor Available / Confirm Stock',
                              priceBasis: p.priceBasis || 'Market reference',
                              shortDescription: p.shortDescription || '',
                              codePrefix: p.codePrefix || '',
                            });
                            setIsOpen(true);
                          }}
                          title="Edit product"
                        >
                          <Pencil className="size-3.5 text-[#6B7280]" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-[#E5E7EB]">
            <p className="text-xs text-[#6B7280]">
              Page {page} of {totalPages}
            </p>
            <div className="flex gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage(page - 1)}
                disabled={page <= 1}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setPage(page + 1)}
                disabled={page >= totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isEditing ? 'Edit Product' : 'Add New Product'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {/* Identity & Classification Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111827] border-b pb-1">1. Product Identity</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="sku">SKU *</Label>
                  <Input
                    id="sku"
                    disabled={isEditing}
                    placeholder="e.g. PL-PVC-001"
                    value={formState.sku}
                    onChange={(e) => setFormState(prev => ({ ...prev, sku: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="name">Product Name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. PVC Pipe 1 inch"
                    value={formState.name}
                    onChange={(e) => setFormState(prev => ({ ...prev, name: e.target.value }))}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    list="category-suggestions"
                    placeholder="e.g. Plumbing"
                    value={formState.category}
                    onChange={(e) => setFormState(prev => ({ ...prev, category: e.target.value }))}
                    required
                  />
                  <datalist id="category-suggestions">
                    {categories.map((c) => (
                      <option key={c} value={c} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    list="subcategory-suggestions"
                    placeholder="e.g. PVC Fittings"
                    value={formState.subcategory}
                    onChange={(e) => setFormState(prev => ({ ...prev, subcategory: e.target.value }))}
                  />
                  <datalist id="subcategory-suggestions">
                    {subcategories.map((s) => (
                      <option key={s} value={s} />
                    ))}
                  </datalist>
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="brand">Brand</Label>
                  <Input
                    id="brand"
                    list="brand-suggestions"
                    placeholder="e.g. Supreme"
                    value={formState.brand}
                    onChange={(e) => setFormState(prev => ({ ...prev, brand: e.target.value }))}
                  />
                  <datalist id="brand-suggestions">
                    {brands.map((b) => (
                      <option key={b} value={b} />
                    ))}
                  </datalist>
                </div>
              </div>
            </div>

            {/* Pricing & Logistics Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111827] border-b pb-1">2. Pricing & Logistics</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="marketPrice">Market Price ($) *</Label>
                  <Input
                    id="marketPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formState.marketPrice || ''}
                    onChange={(e) => handleNumberChange('marketPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="chittetyPrice">Chittety Price ($) *</Label>
                  <Input
                    id="chittetyPrice"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formState.chittetyPrice || ''}
                    onChange={(e) => handleNumberChange('chittetyPrice', e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="discount">Discount Rate (0.1 = 10%)</Label>
                  <Input
                    id="discount"
                    type="number"
                    step="0.01"
                    min="0"
                    max="1"
                    placeholder="0.10"
                    value={formState.discount}
                    onChange={(e) => handleNumberChange('discount', e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    placeholder="e.g. Each, Bag, kg"
                    value={formState.unit}
                    onChange={(e) => setFormState(prev => ({ ...prev, unit: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="moq">MOQ (Min Order Qty)</Label>
                  <Input
                    id="moq"
                    type="number"
                    min="1"
                    placeholder="1"
                    value={formState.moq || ''}
                    onChange={(e) => handleIntChange('moq', e.target.value)}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="priceBasis">Price Basis</Label>
                  <Input
                    id="priceBasis"
                    placeholder="e.g. Market reference"
                    value={formState.priceBasis}
                    onChange={(e) => setFormState(prev => ({ ...prev, priceBasis: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="availability">Availability</Label>
                  <Input
                    id="availability"
                    placeholder="e.g. Vendor Available / Confirm Stock"
                    value={formState.availability}
                    onChange={(e) => setFormState(prev => ({ ...prev, availability: e.target.value }))}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="productType">Product Type</Label>
                  <Input
                    id="productType"
                    placeholder="e.g. Hardware"
                    value={formState.productType}
                    onChange={(e) => setFormState(prev => ({ ...prev, productType: e.target.value }))}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="codePrefix">Code Prefix</Label>
                  <Input
                    id="codePrefix"
                    placeholder="e.g. PL-PVC"
                    value={formState.codePrefix}
                    onChange={(e) => setFormState(prev => ({ ...prev, codePrefix: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Details & Specs Section */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold text-[#111827] border-b pb-1">3. Specifications & Description</h3>
              <div className="space-y-1.5">
                <Label htmlFor="specification">Specification</Label>
                <Input
                  id="specification"
                  placeholder="e.g. Size: 1 inch, Material: PVC, Length: 6m"
                  value={formState.specification}
                  onChange={(e) => setFormState(prev => ({ ...prev, specification: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="shortDescription">Short Description</Label>
                <Textarea
                  id="shortDescription"
                  placeholder="Provide a brief description of the product..."
                  value={formState.shortDescription}
                  onChange={(e) => setFormState(prev => ({ ...prev, shortDescription: e.target.value }))}
                  rows={3}
                />
              </div>
            </div>

            <DialogFooter className="border-t pt-4 gap-2 sm:gap-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="bg-[#111827] hover:bg-[#111827]/90 text-white font-medium"
                disabled={isSubmitting}
              >
                {isSubmitting ? 'Saving...' : isEditing ? 'Update Product' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}