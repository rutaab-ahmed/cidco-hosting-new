
import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { ApiService } from '../services/api';
import { PlotRecord } from '../types';
import { ArrowLeft, FileText, Map, Image as ImageIcon } from 'lucide-react';
import { ImageViewer } from '../components/ImageViewer';

/**
 * Utility to clean database header keys into readable labels
 */
const formatLabel = (key: string) => {
  if (!key) return '';
  return key
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .replace(/[_-]+/g, ' ')  // Replace underscores/hyphens with spaces
    .trim()
    .split(' ')
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
};

export const Details: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [record, setRecord] = useState<PlotRecord | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Image Viewer State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [currentImage, setCurrentImage] = useState('');

  useEffect(() => {
    if (id) {
      ApiService.getRecordById(id).then(r => {
        setRecord(r || null);
        setLoading(false);
      });
    }
  }, [id]);

  const openImage = (src: string) => {
    setCurrentImage(src);
    setIsViewerOpen(true);
  };

  const openFile = (type: 'pdf' | 'map') => {
    if (!record) return;
    const url = type === 'pdf' ? record.pdf_url : record.map_url;
    
    if (url && typeof url === 'string' && url.startsWith('http')) {
      window.open(url, '_blank');
    } else {
      alert(`The ${type} file could not be generated or found in cloud storage.`);
    }
  };

  if (loading) return (
    <div className="text-center p-20 flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      <span className="text-gray-600 font-bold uppercase tracking-widest text-xs">Accessing Secure Ledger...</span>
    </div>
  );

  if (!record) return (
    <div className="text-center p-10 bg-red-50 text-red-600 rounded-xl border border-red-200 mx-auto max-w-md mt-20 font-bold">
      Record UID not found in master database.
    </div>
  );

  const Row = ({ dbKey1, dbKey2, span = false }: { dbKey1: string, dbKey2?: string, span?: boolean }) => (
    <tr className="border-b border-gray-200 hover:bg-gray-50/30 transition-colors">
      <th className="bg-gray-100/80 p-3 text-left text-[10px] font-black text-gray-500 uppercase border-r border-gray-200 w-1/4 whitespace-nowrap tracking-wider">
        {formatLabel(dbKey1)}
      </th>
      <td className={`p-3 text-sm text-gray-800 border-r border-gray-200 font-medium ${span ? '' : 'w-1/4'}`} colSpan={span ? 3 : 1}>
        {record[dbKey1] || '—'}
      </td>
      {!span && dbKey2 && (
        <>
          <th className="bg-gray-100/80 p-3 text-left text-[10px] font-black text-gray-500 uppercase border-r border-gray-200 w-1/4 whitespace-nowrap tracking-wider">
            {formatLabel(dbKey2)}
          </th>
          <td className="p-3 text-sm text-gray-800 w-1/4 font-medium">{record[dbKey2] || '—'}</td>
        </>
      )}
    </tr>
  );

  const SectionHeader = ({ title }: { title: string }) => (
    <tr className="bg-slate-900 text-white">
      <th colSpan={4} className="p-4 text-left font-black tracking-[0.2em] uppercase text-xs">{title}</th>
    </tr>
  );

  return (
    <div className="max-w-[1300px] mx-auto pb-20 px-4 animate-fade-in">
      <div className="mb-8 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <Link to="/?tab=search" className="flex items-center text-indigo-600 hover:text-indigo-800 font-black text-xs uppercase tracking-widest group">
          <ArrowLeft size={18} className="mr-2 group-hover:-translate-x-1 transition-transform" /> Back to result set
        </Link>
        <div className="flex items-center gap-3">
           <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Master Record Identity</span>
           <div className="bg-indigo-600 px-6 py-2 rounded-lg text-white text-sm font-black shadow-lg shadow-indigo-100">
             CIDCO #{record.ID}
           </div>
        </div>
      </div>

      <div className="bg-white shadow-[0_20px_60px_rgba(0,0,0,0.08)] rounded-2xl overflow-hidden border border-gray-100">
        <table className="w-full table-fixed border-collapse">
          <tbody>
            <SectionHeader title="1. Identity Information" />
            <Row dbKey1="ID" dbKey2="NAME_OF_NODE" />
            <Row dbKey1="SECTOR_NO_" dbKey2="BLOCK_ROAD_NAME" />
            <Row dbKey1="PLOT_NO_" dbKey2="PLOT_NO_AFTER_SURVEY" />
            <Row dbKey1="SUB_PLOT_NO_" dbKey2="UID" />

            <SectionHeader title="2. Legal & Allotment Data" />
            <Row dbKey1="DATE_OF_ALLOTMENT" dbKey2="NAME_OF_ORIGINAL_ALLOTTEE" />
            <Row dbKey1="PLOT_AREA_SQM_" dbKey2="BUILTUP_AREA_SQM_" />
            <Row dbKey1="USE_OF_PLOT_ACCORDING_TO_FILE" dbKey2="MAP_AREA" />
            <Row dbKey1="TOTAL_PRICE_RS_" dbKey2="RATE_SQM_" />
            <Row dbKey1="FSI" dbKey2="LEASE_TERM_YEARS_" />
            <Row dbKey1="OCCUPANCY_CERTIFICATE" dbKey2="COMENCEMENT_CERTIFICATE" />
            <Row dbKey1="REGION" dbKey2="PLANNING_USE" />
            <Row dbKey1="Department_Remark" dbKey2="INVESTIGATOR_REMARKS" />

            <SectionHeader title="3. Ownership Succession" />
            <tr className="bg-gray-50 border-b border-gray-200">
               <th className="p-3 text-left text-[10px] font-black text-gray-400 uppercase border-r border-gray-200 tracking-tighter">Ownership Tier</th>
               <th colSpan={2} className="p-3 text-left text-[10px] font-black text-gray-400 uppercase border-r border-gray-200 tracking-tighter">Full Name of Owner</th>
               <th className="p-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-tighter">Transfer Date</th>
            </tr>
            {[2,3,4,5,6,7,8,9,10,11].map(n => {
              const ord = n === 2 ? 'ND' : n === 3 ? 'RD' : 'TH';
              const nameKey = `NAME_OF_${n}${ord}_OWNER`;
              const dateKey = `_${n}${ord}_OWNER_TRANSFER_DATE`;
              return (
                <tr key={n} className="border-b border-gray-200 hover:bg-indigo-50/30 transition-colors">
                  <th className="bg-gray-50/50 p-3 text-left text-[10px] font-bold text-gray-500 border-r border-gray-200 whitespace-nowrap uppercase tracking-tighter">
                    {n}{n===2?'nd':n===3?'rd':'th'} Level Owner
                  </th>
                  <td colSpan={2} className="p-3 text-sm font-black text-indigo-900 border-r border-gray-200">{record[nameKey] || '—'}</td>
                  <td className="p-3 text-sm text-gray-600 font-mono italic">{record[dateKey] || '—'}</td>
                </tr>
              )
            })}

            <SectionHeader title="4. On-Site Survey Findings" />
            <Row dbKey1="TOTAL_AREA_SQM" dbKey2="USE_OF_PLOT" />
            <Row dbKey1="SUB_USE_OF_PLOT" dbKey2="PLOT_STATUS" />
            <Row dbKey1="SURVEY_REMARKS" span={true} />

            <SectionHeader title="5. Quantity & Density Calculations" />
            <Row dbKey1="PLOT_AREA_FOR_INVOICE" dbKey2="PLOT_USE_FOR_INVOICE" />
            <Row dbKey1="Tentative_Plot_Count" dbKey2="Minimum_Plot_Count" />
            <Row dbKey1="Additional_Plot_Count" dbKey2="Base_Plot_Count" />

            <SectionHeader title="6. Secure Evidence Repository" />
            <tr>
              <td colSpan={4} className="p-10 bg-gray-50/50">
                 {record.images && record.images.length > 0 ? (
                   <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 mb-10">
                     {record.images.map((img, idx) => (
                       <div key={idx} className="group relative aspect-square bg-white rounded-2xl overflow-hidden cursor-pointer shadow-xl border border-gray-200 hover:scale-105 transition-all duration-500 hover:shadow-indigo-200" onClick={() => openImage(img)}>
                          <img src={img} alt={`Plot ${idx}`} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                          <div className="absolute inset-0 bg-indigo-900/0 group-hover:bg-indigo-900/60 transition-all duration-300 flex flex-col items-center justify-center">
                             <ImageIcon className="text-white opacity-0 group-hover:opacity-100 scale-50 group-hover:scale-100 transition-all duration-300" size={32} />
                             <span className="text-white opacity-0 group-hover:opacity-100 font-black text-[10px] uppercase mt-2 tracking-widest">Enlarge Photo</span>
                          </div>
                       </div>
                     ))}
                   </div>
                 ) : (
                   <div className="bg-white border-2 border-dashed border-gray-200 rounded-3xl p-16 text-center text-gray-400 font-black uppercase tracking-widest text-[10px] mb-10 shadow-inner">
                     <ImageIcon className="mx-auto mb-4 opacity-10" size={64} />
                     No visual evidence linked to this record
                   </div>
                 )}

                 <div className="flex flex-col sm:flex-row gap-4 justify-center items-stretch pt-10 border-t border-gray-200">
                    <button 
                      onClick={() => openFile('pdf')} 
                      disabled={!record.has_pdf} 
                      className={`flex-1 max-w-sm flex items-center justify-center gap-4 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${record.has_pdf ? 'bg-rose-600 text-white hover:bg-rose-700 hover:-translate-y-1 hover:shadow-rose-200 active:translate-y-0' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                      <FileText size={22} /> View Master PDF
                    </button>
                    <button 
                      onClick={() => openFile('map')} 
                      disabled={!record.has_map} 
                      className={`flex-1 max-w-sm flex items-center justify-center gap-4 px-8 py-5 rounded-2xl font-black uppercase tracking-widest text-xs transition-all shadow-xl ${record.has_map ? 'bg-indigo-600 text-white hover:bg-indigo-700 hover:-translate-y-1 hover:shadow-indigo-200 active:translate-y-0' : 'bg-gray-200 text-gray-400 cursor-not-allowed opacity-50'}`}
                    >
                      <Map size={22} /> View Layout Map
                    </button>
                 </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <ImageViewer src={currentImage} isOpen={isViewerOpen} onClose={() => setIsViewerOpen(false)} />
    </div>
  );
};
