
import React, { useEffect, useState, useRef } from 'react';
import { ApiService } from '../services/api';
import { PlotRecord } from '../types';
import { Link } from 'react-router-dom';
import { Eye, Edit2 } from 'lucide-react';
import { useAuth } from '../App';
import { SearchSuggest } from '../components/SearchSuggest';

export const Search: React.FC = () => {
  const { user } = useAuth();
  const isMounted = useRef(false);
  const [regions, setRegions] = useState<string[]>([]);
  const [nodes, setNodes] = useState<string[]>([]);
  const [sectors, setSectors] = useState<string[]>([]);
  const [blocks, setBlocks] = useState<string[]>([]);
  const [plots, setPlots] = useState<string[]>([]);
  
  const [form, setForm] = useState({ region: '', node: '', sector: '', block: '', plot: '' });
  const [results, setResults] = useState<PlotRecord[] | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    ApiService.getRegions().then(setRegions);
    isMounted.current = true;
  }, []);

  // Cascade Region -> Node
  useEffect(() => {
    ApiService.getNodes(form.region).then(setNodes);
    if (isMounted.current) {
        setForm(p => ({ ...p, node: '', sector: '', block: '', plot: '' }));
    }
  }, [form.region]);

  // Cascade Node -> Sector
  useEffect(() => {
    if (form.node) {
      ApiService.getSectors(form.node, form.region).then(setSectors);
    } else {
      setSectors([]);
    }
    if (isMounted.current) {
        setForm(p => ({ ...p, sector: '', block: '', plot: '' }));
    }
  }, [form.node]);

  // Cascade Sector -> Block/Plot
  useEffect(() => {
    if (form.node && form.sector) {
      ApiService.getBlocks(form.node, form.sector, form.region).then(setBlocks);
      ApiService.getPlots(form.node, form.sector, form.region).then(setPlots);
    } else {
      setBlocks([]);
      setPlots([]);
    }
    if (isMounted.current) {
        setForm(p => ({ ...p, block: '', plot: '' }));
    }
  }, [form.sector]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const data = await ApiService.searchRecords(form.node, form.sector, form.region, form.block, form.plot);
    setResults(data);
    setLoading(false);
  };

  return (
    <div className="max-w-[1600px] mx-auto space-y-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-8 relative z-[60]">
        <h1 className="text-2xl font-bold text-gray-900 mb-6 border-b pb-4">Search Plot Records</h1>
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
          <SearchSuggest 
            label="Region"
            options={regions}
            value={form.region}
            onChange={val => setForm({ ...form, region: val })}
            placeholder="Search Region"
          />
          
          <SearchSuggest 
            label="Node Name"
            required
            options={nodes}
            value={form.node}
            onChange={val => setForm({ ...form, node: val })}
            placeholder="Search Node"
          />

          <SearchSuggest 
            label="Sector No."
            required
            disabled={!form.node}
            options={sectors}
            value={form.sector}
            onChange={val => setForm({ ...form, sector: val })}
            placeholder="Search Sector"
          />

          <SearchSuggest 
            label="Block / Road"
            disabled={!form.sector}
            options={blocks}
            value={form.block}
            onChange={val => setForm({ ...form, block: val })}
            placeholder="Search Block"
          />

          <SearchSuggest 
            label="Plot No."
            disabled={!form.sector}
            options={plots}
            value={form.plot}
            onChange={val => setForm({ ...form, plot: val })}
            placeholder="Search Plot"
          />

          <div className="md:col-span-3 lg:col-span-5 flex justify-end gap-4 mt-4">
            <Link to="/" className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={!form.node || !form.sector || loading}
              className="px-8 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition shadow-md disabled:opacity-50"
            >
              {loading ? 'Searching...' : 'Search Records'}
            </button>
          </div>
        </form>
      </div>

      {results !== null && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden animate-fade-in relative z-10">
          <div className="p-4 bg-gray-50 border-b"><h2 className="font-semibold text-gray-800">Search Results ({results.length})</h2></div>
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-max">
              <thead className="bg-gray-50 text-gray-600 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-3 whitespace-nowrap">ID</th>
                  <th className="px-6 py-3 whitespace-nowrap">Node</th>
                  <th className="px-6 py-3 whitespace-nowrap">Sector</th>
                  <th className="px-6 py-3 whitespace-nowrap">Plot</th>
                  <th className="px-6 py-3 text-right whitespace-nowrap">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {results.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No records match your criteria.</td></tr>
                ) : (
                  results.map(row => (
                    <tr key={row.ID} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 font-mono text-sm text-gray-600">#{row.ID}</td>
                      <td className="px-6 py-4 text-gray-800 font-medium">{row.NAME_OF_NODE}</td>
                      <td className="px-6 py-4 text-gray-600">{row.SECTOR_NO_}</td>
                      <td className="px-6 py-4 text-gray-600 font-semibold">{row.PLOT_NO_}</td>
                      <td className="px-6 py-4 text-right flex justify-end gap-2">
                        <Link to={`/details/${row.ID}`} className="flex items-center gap-1 px-3 py-1 bg-green-100 text-green-700 hover:bg-green-200 rounded text-sm font-medium transition"><Eye size={14} /> View</Link>
                        {user?.role === 'admin' && <Link to={`/edit/${row.ID}`} className="flex items-center gap-1 px-3 py-1 bg-amber-100 text-amber-700 hover:bg-amber-200 rounded text-sm font-medium transition"><Edit2 size={14} /> Edit</Link>}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
