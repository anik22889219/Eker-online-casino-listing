import React, { useState, useEffect } from 'react';
import { AffiliateLink } from '../../types';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';

interface ListingFormProps {
  link?: AffiliateLink | null;
  onSubmit: (data: Partial<AffiliateLink>) => void;
  onCancel: () => void;
  isLoading?: boolean;
}

export const ListingForm: React.FC<ListingFormProps> = ({
  link,
  onSubmit,
  onCancel,
  isLoading = false,
}) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [commission, setCommission] = useState('');
  const [category, setCategory] = useState('Casino');
  const [imageUrl, setImageUrl] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (link) {
      setName(link.name || '');
      setUrl(link.url || '');
      setCommission(link.commission || '');
      setCategory(link.category || 'Casino');
      setImageUrl(link.imageUrl || '');
      setStatus(link.status || 'active');
    } else {
      setName('');
      setUrl('');
      setCommission('');
      setCategory('Casino');
      setImageUrl('');
      setStatus('active');
    }
  }, [link]);

  const validate = () => {
    const tempErrors: Record<string, string> = {};
    if (!name.trim()) tempErrors.name = 'Casino/Deal Name is required';
    if (!url.trim()) {
      tempErrors.url = 'Affiliate URL is required';
    } else {
      try {
        new URL(url);
      } catch (_) {
        tempErrors.url = 'Enter a valid URL (e.g., https://...)';
      }
    }
    if (!commission.trim()) tempErrors.commission = 'Commission detail is required';
    
    setErrors(tempErrors);
    return Object.keys(tempErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    onSubmit({
      name,
      url,
      commission,
      category,
      imageUrl: imageUrl.trim() || undefined,
      status,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <Input
        label="Casino or Deal Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder="e.g., Stake Casino"
        disabled={isLoading}
      />

      <Input
        label="Affiliate Link / Landing Page URL"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        error={errors.url}
        placeholder="https://your-affiliate-link.com"
        disabled={isLoading}
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Commission Rate or Deal"
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          error={errors.commission}
          placeholder="e.g., 45% RevShare or $100 CPA"
          disabled={isLoading}
        />

        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-slate-700 tracking-wide">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            disabled={isLoading}
            className="text-sm px-3 py-2 border border-slate-300 rounded-lg bg-white outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="Casino">Casino</option>
            <option value="Poker">Poker</option>
            <option value="Sportsbook">Sportsbook</option>
            <option value="Crypto">Crypto</option>
            <option value="Bonus">Bonus</option>
          </select>
        </div>
      </div>

      <Input
        label="Casino Logo or Banner Image URL"
        value={imageUrl}
        onChange={(e) => setImageUrl(e.target.value)}
        placeholder="https://example.com/logo.png"
        disabled={isLoading}
      />

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-slate-700 tracking-wide">Status</label>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={status === 'active'}
              onChange={() => setStatus('active')}
              disabled={isLoading}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            Active (Listed publicly)
          </label>
          <label className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
            <input
              type="radio"
              checked={status === 'inactive'}
              onChange={() => setStatus('inactive')}
              disabled={isLoading}
              className="text-indigo-600 focus:ring-indigo-500"
            />
            Inactive (Hidden)
          </label>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="submit" loading={isLoading}>
          {link ? 'Save Changes' : 'Create Listing'}
        </Button>
      </div>
    </form>
  );
};
