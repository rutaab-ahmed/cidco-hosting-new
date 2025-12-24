
import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { ApiService } from '../services/api';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';

/**
 * Utility to clean database header keys into readable labels
 */
const formatLabel = (key: string) => {
  if (!key) return '';
  return key
    .replace(/^_+|_+$/g, '') 
    .replace(/[_-]+/g, ' ')  
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

const InputField = ({ dbKey, value, onChange, type = "text", full = false, readOnly = false }: any) => (
  <div className={`${full ? 'md:col-span-2' : ''}`}>
    <label className="block text-[10px] font-black text-gray-500 uppercase mb-1 tracking-wider">
      {formatLabel(dbKey)} {readOnly ? '(Fixed)' : ''}
    </label>
    {type === 'textarea' ? (
      <textarea 
        name={dbKey} 
        value={value || ''} 
        onChange={onChange} 
        readOnly={readOnly}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all ${readOnly ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400 bg-white shadow-sm'}`} 
        rows={3} 
      />
    ) : (
      <input 
        type="text" 
        name={dbKey} 
        value={value || ''} 
        onChange={onChange} 
        readOnly={readOnly}
        className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-sm transition-all ${readOnly ? 'bg-gray-100 text-gray-500 border-gray-200 cursor-not-allowed' : 'border-gray-300 hover:border-gray-400 bg-white shadow-sm'}`} 
      />
    )}
  </div>
);

const FormSection = ({ title, children }: { title: string, children: React.ReactNode }) => (
  <div className="mb-10 animate-fade-in">
    <div className="bg-slate-800 text-white px-5 py-3 font-black text-xs uppercase tracking-[0.2em] mb-6 rounded-lg shadow-md">
      {title}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 px-2">
      {children}
    </div>
  </div>
);

export const Edit: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: '', text: '' });

  useEffect(() => {
    if (id) {
      ApiService.getRecordById(id).then(r => {
        if (r) setFormData(r);
        setLoading(false);
      });
    }
  }, [id]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg({ type: '', text: '' });

    if (!id) return;
    
    const success = await ApiService.updateRecord(id, formData);
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (success) {
      setMsg({ type: 'success', text: 'Master data updated successfully! Syncing records...' });
      setTimeout(() => navigate(`/details/${id}`), 1500);
    } else {
      setMsg({ type: 'error', text: 'Update rejected. Please verify database connection.' });
    }
    setSaving(false);
  };

  if (loading) return <div className="text-center p-20 flex flex-col items-center gap-4">
    <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
    <span className="text-gray-500 font-bold uppercase tracking-widest text-xs">Opening Database Editor...</span>
  </div>;

  if (!formData.ID) return <div className="text-center p-10 bg-red-50 text-red-600 rounded-xl border border-red-200 mx-auto max-w-md mt-20 font-bold">Authentication failed or record missing.</div>;

  return (
    <div className="max-w-[1400px] mx-auto pb-20 px-4">
      <div className="mb-8 flex items-center justify-between bg-white p-4 rounded-xl border shadow-sm">
        <Link to={`/details/${id}`} className="flex items-center text-gray-600 hover:text-indigo-600 font-black text-xs uppercase tracking-widest transition-colors">
          <ArrowLeft size={16} className="mr-2" /> Discard All Changes
        </Link>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black text-gray-400 uppercase">Authenticated Ledger Editor</span>
           <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-md text-xs font-black border border-amber-200 tracking-widest">RECORD: {id}</span>
        </div>
      </div>

      <div className="bg-white shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-2xl border border-gray-100 p-8 md:p-12 relative">
        {msg.text && (
          <div className={`p-4 rounded-xl mb-10 text-center font-black text-sm uppercase tracking-wider flex items-center justify-center gap-2 animate-bounce ${msg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
            <AlertCircle size={18} /> {msg.text}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          
          <FormSection title="1. Primary Identification Headers">
             <InputField dbKey="ID" value={formData.ID} readOnly={true} />
             <InputField dbKey="NAME_OF_NODE" value={formData.NAME_OF_NODE} onChange={handleChange} />
             <InputField dbKey="SECTOR_NO_" value={formData.SECTOR_NO_} onChange={handleChange} />
             <InputField dbKey="BLOCK_ROAD_NAME" value={formData.BLOCK_ROAD_NAME} onChange={handleChange} />
             <InputField dbKey="PLOT_NO_" value={formData.PLOT_NO_} onChange={handleChange} />
             <InputField dbKey="PLOT_NO_AFTER_SURVEY" value={formData.PLOT_NO_AFTER_SURVEY} onChange={handleChange} />
             <InputField dbKey="SUB_PLOT_NO_" value={formData.SUB_PLOT_NO_} onChange={handleChange} />
             <InputField dbKey="UID" value={formData.UID} onChange={handleChange} />
             <InputField dbKey="REGION" value={formData.REGION} onChange={handleChange} />
          </FormSection>

          <FormSection title="2. Legal Allotment & Core Metrics">
             <InputField dbKey="DATE_OF_ALLOTMENT" value={formData.DATE_OF_ALLOTMENT} onChange={handleChange} />
             <InputField dbKey="NAME_OF_ORIGINAL_ALLOTTEE" value={formData.NAME_OF_ORIGINAL_ALLOTTEE} onChange={handleChange} />
             <InputField dbKey="PLOT_AREA_SQM_" value={formData.PLOT_AREA_SQM_} onChange={handleChange} />
             <InputField dbKey="BUILTUP_AREA_SQM_" value={formData.BUILTUP_AREA_SQM_} onChange={handleChange} />
             <InputField dbKey="USE_OF_PLOT_ACCORDING_TO_FILE" value={formData.USE_OF_PLOT_ACCORDING_TO_FILE} onChange={handleChange} />
             <InputField dbKey="MAP_AREA" value={formData.MAP_AREA} onChange={handleChange} />
             <InputField dbKey="TOTAL_PRICE_RS_" value={formData.TOTAL_PRICE_RS_} onChange={handleChange} />
             <InputField dbKey="RATE_SQM_" value={formData.RATE_SQM_} onChange={handleChange} />
             <InputField dbKey="FSI" value={formData.FSI} onChange={handleChange} />
             <InputField dbKey="LEASE_TERM_YEARS_" value={formData.LEASE_TERM_YEARS_} onChange={handleChange} />
             <InputField dbKey="OCCUPANCY_CERTIFICATE" value={formData.OCCUPANCY_CERTIFICATE} onChange={handleChange} />
             <InputField dbKey="COMENCEMENT_CERTIFICATE" value={formData.COMENCEMENT_CERTIFICATE} onChange={handleChange} />
             <InputField dbKey="PLANNING_USE" value={formData.PLANNING_USE} onChange={handleChange} />
             <InputField dbKey="FILE_LOCATION" value={formData.FILE_LOCATION} onChange={handleChange} />
             <InputField dbKey="Department_Remark" value={formData.Department_Remark} onChange={handleChange} type="textarea" full />
             <InputField dbKey="INVESTIGATOR_REMARKS" value={formData.INVESTIGATOR_REMARKS} onChange={handleChange} type="textarea" full />
          </FormSection>

          <FormSection title="3. Succession & Transfer Timeline">
             {[2,3,4,5,6,7,8,9,10,11].map(n => {
                const ord = n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH';
                const nameKey = `NAME_OF_${n}${ord}_OWNER`;
                const dateKey = `_${n}${ord}_OWNER_TRANSFER_DATE`;
                return (
                  <React.Fragment key={n}>
                     <InputField dbKey={nameKey} value={formData[nameKey]} onChange={handleChange} />
                     <InputField dbKey={dateKey} value={formData[dateKey]} onChange={handleChange} />
                  </React.Fragment>
                )
             })}
          </FormSection>

          <FormSection title="4. Physical Survey Metadata">
             <InputField dbKey="TOTAL_AREA_SQM" value={formData.TOTAL_AREA_SQM} onChange={handleChange} />
             <InputField dbKey="USE_OF_PLOT" value={formData.USE_OF_PLOT} onChange={handleChange} />
             <InputField dbKey="SUB_USE_OF_PLOT" value={formData.SUB_USE_OF_PLOT} onChange={handleChange} />
             <InputField dbKey="PLOT_STATUS" value={formData.PLOT_STATUS} onChange={handleChange} />
             <InputField dbKey="SURVEY_REMARKS" value={formData.SURVEY_REMARKS} onChange={handleChange} type="textarea" full />
             <InputField dbKey="PHOTO_FOLDER" value={formData.PHOTO_FOLDER} onChange={handleChange} />
          </FormSection>

          <FormSection title="5. Financial Auditing & Counts">
             <InputField dbKey="PLOT_AREA_FOR_INVOICE" value={formData.PLOT_AREA_FOR_INVOICE} onChange={handleChange} />
             <InputField dbKey="PLOT_USE_FOR_INVOICE" value={formData.PLOT_USE_FOR_INVOICE} onChange={handleChange} />
             <InputField dbKey="Tentative_Plot_Count" value={formData.Tentative_Plot_Count} onChange={handleChange} />
             <InputField dbKey="Minimum_Plot_Count" value={formData.Minimum_Plot_Count} onChange={handleChange} />
             <InputField dbKey="Additional_Plot_Count" value={formData.Additional_Plot_Count} onChange={handleChange} />
             <InputField dbKey="Base_Plot_Count" value={formData.Base_Plot_Count} onChange={handleChange} />
             <InputField dbKey="Percentage_Match" value={formData.Percentage_Match} onChange={handleChange} />
          </FormSection>

          <FormSection title="6. Source Registry & Flags">
             <InputField dbKey="FILE_NAME" value={formData.FILE_NAME} onChange={handleChange} />
             <InputField dbKey="SUBMISSION" value={formData.SUBMISSION} onChange={handleChange} />
             <InputField dbKey="IMAGES_PRESENT" value={formData.IMAGES_PRESENT} onChange={handleChange} />
             <InputField dbKey="PDFS_PRESENT" value={formData.PDFS_PRESENT} onChange={handleChange} />
             <InputField dbKey="INVESTIGATOR_NAME" value={formData.INVESTIGATOR_NAME} onChange={handleChange} />
          </FormSection>

          <div className="mt-12 flex flex-col sm:flex-row gap-4 border-t pt-10">
             <button 
               type="submit" 
               disabled={saving}
               className="flex-1 bg-indigo-600 text-white px-10 py-4 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 disabled:opacity-50 shadow-xl hover:shadow-indigo-200 hover:-translate-y-1 active:translate-y-0"
             >
               {saving ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> : <Save size={20} />} 
               {saving ? 'Synchronizing...' : 'Save Database Record'}
             </button>
             <button 
               type="button" 
               onClick={() => navigate(`/details/${id}`)}
               className="px-10 py-4 border-2 border-gray-200 text-gray-500 rounded-xl font-black uppercase tracking-widest text-sm hover:bg-gray-50 transition-all"
             >
               Discard
             </button>
          </div>

        </form>
      </div>
    </div>
  );
};
