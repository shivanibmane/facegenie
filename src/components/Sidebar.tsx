import {
  LayoutDashboard,
  Camera,
  MonitorPlay,
  Settings,
  BarChart3,
  Database,
  MonitorCog,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useEffect } from "react";
import {
  useGetIndustriesQuery,
  useSelectIndustryMutation,
} from "../store/api/industriesApi";
 
const Sidebar = ({ onIndustryChange }) => {
  const location = useLocation();
  const { data: industries = [] } = useGetIndustriesQuery();
 
  const [selectedIndustry, setSelectedIndustry] = useState("retail");
  const [selectedSubIndustry, setSelectedSubIndustry] = useState("store_analytics");
  const [selectIndustry] = useSelectIndustryMutation();
 
 
  useEffect(() => {
    if (selectedIndustry && selectedSubIndustry) {
      selectIndustry({
        industryId: selectedIndustry,
        subIndustryId: selectedSubIndustry,
      })
        .unwrap()
        .then((response) => console.log("Default selection made:", response.message))
        .catch((error) => console.error("Error setting default sub-industry:", error));
      onIndustryChange({
        industryId: selectedIndustry,
        subIndustryId: selectedSubIndustry,
      });
    }
  }, [selectedIndustry, selectedSubIndustry, onIndustryChange, selectIndustry]);
 
  const selectedIndustryData = industries.find(
    (industry) => industry.id === selectedIndustry
  );
 
  const menuItems = [
    { icon: MonitorCog, label: "Configuration", path: "/" },
    { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
    { icon: Camera, label: "Cameras", path: "/cameras" },
    { icon: MonitorPlay, label: "Detection Models", path: "/models" },
    { icon: Settings, label: "Processing Rules", path: "/rules" },
    { icon: Database, label: "Database", path: "/database" },
    { icon: BarChart3, label: "Insights", path: "/insights" },
  ];
 
  return (
    <div className="h-screen w-64 bg-white text-[#F7493B] px-4 py-2 fixed left-0 top-0 flex flex-col justify-between">
      {/* Top Section */}
      <div>
        {/* Branding */}
        <div className="flex flex-col items-center gap-2 mb-6">
          <img
            src="FaceGenie Logo.png"
            alt="Logo"
            className="w-40 h-10 object-contain"
          />
        </div>
 
        {/* Industry Selection Dropdown (Commented Out) */}
        {/* <div className="mb-2 px-4">
          <label className="text-sm font-medium text-gray-700">
            Select Industry
          </label>
          <select
            className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
            value={selectedIndustry}
            onChange={handleIndustrySelect}
          >
            <option value="" disabled>
              Select an Industry
            </option>
            {industries.map((industry) => (
              <option key={industry.id} value={industry.id}>
                {industry.name}
              </option>
            ))}
          </select>
        </div> */}
 
        {/* Sub-Industry Selection Dropdown (Commented Out) */}
        {/* {selectedIndustry && selectedIndustryData?.sub_industries?.length > 0 && (
          <div className="mb-2 px-4">
            <label className="text-sm font-medium text-gray-700">
              Select Sub-Industry
            </label>
            <select
              className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-400 cursor-pointer"
              value={selectedSubIndustry}
              onChange={handleSubIndustrySelect}
            >
              <option value="" disabled>
                Select Sub-Industry
              </option>
              {selectedIndustryData.sub_industries.map((subIndustry) => (
                <option key={subIndustry.id} value={subIndustry.id}>
                  {subIndustry.name}
                </option>
              ))}
            </select>
          </div>
        )} */}
 
        {/* Navigation Menu */}
        <nav className="space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
 
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors text-red-500 ${isActive
                  ? "bg-red-500 text-white"
                  : "hover:text-white hover:bg-red-400"
                  }`}
              >
                <Icon className="w-5 h-5" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
 
      {/* Bottom Logo */}
      <div className="flex justify-center">
        <img src="LOGO 1.png" alt="Logo" className="w-40 h-20 object-contain" />
      </div>
    </div>
  );
};
 
export default Sidebar;