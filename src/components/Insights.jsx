import { useEffect, useState } from "react";
import axios from "axios";
import { Camera, Users, AlertTriangle, Search, X, Calendar, Clock } from "lucide-react";
import DetectionsTable from "../components/insights/DetectionsTable";
 
const Insights = () => {
  const [detections, setDetections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [searchDate, setSearchDate] = useState("");
  const [searchTime, setSearchTime] = useState("");
  const [filteredDetections, setFilteredDetections] = useState(null);
  const [industries, setIndustries] = useState([]);
  const [selectedIndustry, setSelectedIndustry] = useState("");
  const [subIndustries, setSubIndustries] = useState([]);
  const [selectedSubIndustry, setSelectedSubIndustry] = useState("");
  const [rules, setRules] = useState([]);
  const [selectedRule, setSelectedRule] = useState("");
 
  useEffect(() => {
    const fetchDetections = async () => {
      if (!selectedIndustry || !selectedSubIndustry || !selectedRule) {
        setDetections([]);
        setFilteredDetections(null);
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        const response = await axios.get(
          `http://localhost:8000/get_data?industry_id=${selectedIndustry}&sub_industry_id=${selectedSubIndustry}&rule_id=${selectedRule}`
        );
        setDetections(response.data);
        setFilteredDetections(null);
      } catch (error) {
        setError(error.response?.data?.detail || "Failed to fetch detections");
        console.error("Detections fetch error:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchDetections();
  }, [selectedIndustry, selectedSubIndustry, selectedRule]);
 
  useEffect(() => {
    const fetchIndustries = async () => {
      try {
        const response = await axios.get("http://localhost:8000/dbindustries");
        setIndustries(response.data);
        console.log("Fetched industries:", response.data);
      } catch (error) {
        setError("Failed to fetch industries");
        console.error("Industries fetch error:", error);
      }
    };
    fetchIndustries();
  }, []);
 
  useEffect(() => {
    const fetchSubIndustries = async () => {
      if (selectedIndustry) {
        try {
          const response = await axios.get(`http://localhost:8000/dbsubindustries/${selectedIndustry}`);
          setSubIndustries(response.data);
          console.log("Fetched subIndustries:", response.data);
        } catch (error) {
          setError("Failed to fetch sub-industries");
          console.error("Sub-industries fetch error:", error);
        }
      } else {
        setSubIndustries([]);
        setSelectedSubIndustry("");
        setRules([]);
        setSelectedRule("");
      }
    };
    fetchSubIndustries();
  }, [selectedIndustry]);
 
  useEffect(() => {
    const fetchRules = async () => {
      if (selectedIndustry && selectedSubIndustry) {
        try {
          const response = await axios.get(
            `http://localhost:8000/dbindustry_rules/${selectedIndustry}/${selectedSubIndustry}`
          );
          const uniqueRules = [];
          const seenIds = new Set();
          response.data.forEach((rule) => {
            if (!seenIds.has(rule.id)) {
              uniqueRules.push(rule);
              seenIds.add(rule.id);
            }
          });
          setRules(uniqueRules);
          console.log("Fetched unique rules for", selectedIndustry, selectedSubIndustry, ":", uniqueRules);
        } catch (error) {
          setError("Failed to fetch rules");
          console.error("Rules fetch error:", error);
        }
      } else {
        setRules([]);
        setSelectedRule("");
      }
    };
    fetchRules();
  }, [selectedIndustry, selectedSubIndustry]);
 
  const handleSearch = () => {
    const trimmedDate = searchDate.trim();
    const trimmedTime = searchTime.trim();
 
    if (!trimmedDate && !trimmedTime) {
      setFilteredDetections(null);
      return;
    }
 
    const filtered = detections.filter((detection) => {
      if (trimmedDate && trimmedTime) {
        return (
          detection.current_date?.includes(trimmedDate) &&
          detection.current_Time?.includes(trimmedTime)
        );
      } else if (trimmedDate) {
        return detection.current_date?.includes(trimmedDate);
      } else if (trimmedTime) {
        return detection.current_Time?.includes(trimmedTime);
      }
      return false;
    });
 
    setFilteredDetections(filtered.length > 0 ? filtered : []);
  };
 
  useEffect(() => {
    if (!searchDate.trim() && !searchTime.trim()) {
      setFilteredDetections(null);
    }
  }, [searchDate, searchTime]);
 
  const handleClearSearch = () => {
    setSearchDate("");
    setSearchTime("");
    setFilteredDetections(null);
  };
 
  const handleIndustryChange = (e) => {
    setSelectedIndustry(e.target.value);
    setSelectedSubIndustry("");
    setSubIndustries([]);
    setSelectedRule("");
    setRules([]);
  };
 
  useEffect(() => {
    console.log("Insights - selectedRule:", selectedRule);
  }, [selectedRule]);
 
  return (
    <div className="p-6">
      <div className="bg-white rounded-lg shadow-md p-4 mb-6">
        <h2 className="text-lg font-semibold mb-4">Search Detection</h2>
        <div className="flex flex-col md:flex-row items-center gap-4 mb-6">
          <div className="flex flex-col">
            <label htmlFor="industrySelect" className="text-gray-600 mb-1 mx-1">Industry</label>
            <select
              id="industrySelect"
              value={selectedIndustry}
              onChange={handleIndustryChange}
              className="border rounded-lg px-3 py-2 focus:ring focus:border-blue-500 bg-white text-red-500 w-48"
            >
              <option value="" disabled>Select Industry</option>
              {industries.map((industry) => (
                <option key={industry.id} value={industry.id}>
                  {industry.name}
                </option>
              ))}
            </select>
          </div>
 
          <div className="flex flex-col">
            <label htmlFor="subIndustrySelect" className="text-gray-600 mb-1 mx-1">Sub-Industry</label>
            <select
              id="subIndustrySelect"
              value={selectedSubIndustry}
              onChange={(e) => setSelectedSubIndustry(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring focus:border-blue-500 bg-white text-red-500 w-48"
              disabled={!selectedIndustry}
            >
              <option value="" disabled>Select Sub-Industry</option>
              {subIndustries.map((subIndustry) => (
                <option key={subIndustry.id} value={subIndustry.id}>
                  {subIndustry.name}
                </option>
              ))}
            </select>
          </div>
 
          <div className="flex flex-col">
            <label htmlFor="ruleSelect" className="text-gray-600 mb-1 mx-1">Rule</label>
            <select
              id="ruleSelect"
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              className="border rounded-lg px-3 py-2 focus:ring focus:border-blue-500 bg-white text-red-500 w-48"
              disabled={!selectedSubIndustry}
            >
              <option value="" disabled>Select Rule</option>
              {rules.map((rule) => (
                <option key={rule.id} value={rule.id}>
                  {rule.rule}
                </option>
              ))}
            </select>
          </div>
 
          <div className="flex flex-col">
            <label htmlFor="searchDate" className="text-gray-600 mb-1 mx-1">Date</label>
            <div className="flex items-center border rounded-lg px-3 py-2 focus-within:ring focus-within:border-blue-500 bg-white">
              <Calendar className="text-gray-500 mr-2" size={20} />
              <input
                id="searchDate"
                type="text"
                placeholder="DD-MM-YYYY"
                value={searchDate}
                onChange={(e) => setSearchDate(e.target.value)}
                className="outline-none w-full bg-white"
              />
            </div>
          </div>
 
          <div className="flex flex-col">
            <label htmlFor="searchTime" className="text-gray-600 mb-1 mx-1">Time</label>
            <div className="flex items-center border rounded-lg px-3 py-2 focus-within:ring focus-within:border-blue-500 bg-white">
              <Clock className="text-gray-500 mr-2" size={20} />
              <input
                id="searchTime"
                type="text"
                placeholder="HH:MM:SS"
                value={searchTime}
                onChange={(e) => setSearchTime(e.target.value)}
                className="outline-none w-full bg-white"
              />
            </div>
          </div>
 
          <div className="flex gap-2">
            <button
              onClick={handleSearch}
              className="p-2 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center mt-6"
            >
              <Search className="text-gray-700" size={24} />
            </button>
            <button
              onClick={handleClearSearch}
              className="p-2 rounded-full bg-red-200 hover:bg-red-300 flex items-center justify-center mt-6"
            >
              <X className="text-red-700" size={24} />
            </button>
          </div>
        </div>
      </div>
 
      {loading ? (
        <p className="text-center text-gray-600">Loading detections...</p>
      ) : error ? (
        <p className="text-center text-red-600">{error}</p>
      ) : filteredDetections !== null && filteredDetections.length === 0 ? (
        <p className="text-center text-gray-500">No matching detections found.</p>
      ) : detections.length === 0 ? (
        <p className="text-center text-gray-500">Please select an industry, sub-industry, and rule.</p>
      ) : (
        <DetectionsTable
          detections={filteredDetections !== null ? filteredDetections : detections}
          selectedRule={rules.find((rule) => rule.id === selectedRule)}
        />
      )}
    </div>
  );
};
 
export default Insights;