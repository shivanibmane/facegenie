import React, { useEffect, useRef, useState } from "react";
import {
  Camera,
  Brain,
  Cog,
  Database as DatabaseIcon,
  CircleFadingPlus,
} from "lucide-react";
import { useCreateMediaProcessingMutation } from "../store/api/mediaProcessing";
import { useGetDetectionModelsQuery } from "../store/api/detectionModels";
import {
  useGetOutputConfigurationsQuery,
  useUpdateOutputConfigurationsMutation,
} from "../store/api/outputConfigurations";
import Loader from "./common/Loader";
import { DetectionModel } from "../store/models/DetectionModel";
import { useGetProcessingRulesByModelQuery } from "../store/api/processingRules";
import { ProcessingRulesModel } from "../store/models/ProcessingRules";
import MediaFrameSelector from "./insights/MediaFrameSelector";
import { setPreivewUrl as setVideoPreviewUrl } from "../store/api/localData/previewUrl";
import { setDetectionModel } from "../store/api/localData/detectionModel";
import { setIsToggled, setStorageLocation, setOutputFormat, setSaveDetectionImages } from "../store/api/localData/outputConfiguration";
import { addSessionId } from "../store/api/localData/sessionSlice";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../store/middleware";
import { toast, Bounce } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface ConfigurationProps {
  selectedIndustry: string;
}

interface CameraData {
  camera_name: string;
  location: string;
  stream_url: string;
}

const Configuration: React.FC<ConfigurationProps> = ({ selectedIndustry }) => {
  const [createMutation, { isLoading: createLoading }] = useCreateMediaProcessingMutation();
  const [updateMutation, { isLoading: updateLoading }] = useUpdateOutputConfigurationsMutation();

  const { data: modelRows = [], isLoading: modelLoading } = useGetDetectionModelsQuery(selectedIndustry);

  const {
    data: outputObject = {
      storage: [""],
      format: [""],
      current_output_configurations: ["", ""],
    },
    isLoading: outputLoading,
  } = useGetOutputConfigurationsQuery();

  const dispatch = useDispatch<AppDispatch>();
  const savedPreivewUrl = useSelector((state: RootState) => state.previewUrl.previewUrl);
  const savedOutputConfiguration = useSelector((state: RootState) => state.outputConfiguration);

  // Initialize selectedModel as empty string to show placeholder
  const [selectedModel, setSelectedModel] = React.useState<string>("");
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(savedPreivewUrl || null);
  const [rules, setRules] = React.useState<ProcessingRulesModel[]>([]);
  const [params, setParams] = React.useState<Record<string, boolean>>({});
  const [saveOutput, setSaveOutput] = React.useState<boolean>(savedOutputConfiguration.isToggled || false);
  const [output, setOutput] = React.useState<string[]>(outputObject.current_output_configurations);
  const [isChecked, setIsChecked] = React.useState<boolean>(savedOutputConfiguration.saveDetectionImages || false);

  // New state for camera data
  const [cameraData, setCameraData] = React.useState<CameraData[]>([]);
  const [selectedCamera, setSelectedCamera] = React.useState<CameraData | null>(null);
  const [loadingCameras, setLoadingCameras] = React.useState<boolean>(false);
  const [loadingPreview, setLoadingPreview] = React.useState<boolean>(false);

  // Reset state when selectedIndustry changes
  useEffect(() => {
    setSelectedModel("");
    setSelectedCamera(null);
    setPreviewUrl(null);
    setRules([]);
    setParams({});
    dispatch(setVideoPreviewUrl(null));
    dispatch(setDetectionModel(""));
  }, [selectedIndustry, dispatch]);

  // Fetch camera data on component mount
  useEffect(() => {
    const fetchCameraData = async () => {
      setLoadingCameras(true);
      try {
        const response = await fetch('http://localhost:8000/get_cam_data');
        if (!response.ok) {
          throw new Error('Failed to fetch camera data');
        }
        const data = await response.json();
        setCameraData(data);
      } catch (error) {
        toast.error("Failed to fetch camera data", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      } finally {
        setLoadingCameras(false);
      }
    };

    fetchCameraData();
  }, []);

  const { data: rulesByModel, isLoading: rulesByModelLoading } =
    useGetProcessingRulesByModelQuery(
      { industry: selectedIndustry, modelId: selectedModel },
      {
        skip: !selectedIndustry || !selectedModel || selectedModel === "",
      }
    );

  useEffect(() => {
    if (rulesByModel && rulesByModel.length > 0) {
      setRules(rulesByModel);
      const newParams = rulesByModel.reduce<Record<string, boolean>>((acc, ruleObj) => {
        acc[ruleObj.rule] = false;
        return acc;
      }, {});

      const firstEnabledRule = rulesByModel.find(rule => rule.enabled);
      if (firstEnabledRule) {
        newParams[firstEnabledRule.rule] = true;
      }

      setParams(newParams);
    } else {
      setRules([]);
      setParams({});
    }
  }, [rulesByModel]);

  useEffect(() => {
    return () => {
      dispatch(setVideoPreviewUrl(null));
    };
  }, [dispatch]);

  const handleCameraSelect = async (camera: CameraData) => {
    if (!selectedIndustry || selectedIndustry === "") {
      toast.error("Please select an industry first", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      return;
    }

    if (!camera.stream_url) {
      toast.error("Invalid camera stream URL", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      return;
    }

    setSelectedCamera(camera);
    setLoadingPreview(true);

    try {
      const response = await fetch('http://localhost:8000/send_first_frame', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ stream_url: camera.stream_url }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch frame from stream: ${response.status}`);
      }

      const data = await response.json();
      if (!data.image) {
        throw new Error('No image data in response');
      }

      const imageUrl = `data:image/jpeg;base64,${data.image}`;
      dispatch(setVideoPreviewUrl(imageUrl));
      setPreviewUrl(imageUrl);
    } catch (error) {
      console.error("Error fetching preview:", error);
      toast.error(`Failed to get preview from camera stream: ${error.message}`, {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      setSelectedCamera(null);
    } finally {
      setLoadingPreview(false);
    }
  };

  const [isUploading, setIsUploading] = React.useState(false);

  const resetForm = () => {
    setSelectedCamera(null);
    setPreviewUrl(null);
    setSelectedModel("");
    setRules([]);
    setParams({});
    setOutput(outputObject.current_output_configurations);
    setSaveOutput(false);
    setIsChecked(false);

    dispatch(setVideoPreviewUrl(null));
    dispatch(setDetectionModel(""));
    dispatch(setIsToggled(false));
    dispatch(setStorageLocation(outputObject.storage[0] || ""));
    dispatch(setOutputFormat(outputObject.format[0] || ""));
    dispatch(setSaveDetectionImages(false));
  };

  const toggleRule = (rule: string) => {
    setParams((prevParams) => {
      const newParams = Object.keys(prevParams).reduce((acc, key) => {
        acc[key] = false;
        return acc;
      }, {} as Record<string, boolean>);

      newParams[rule] = true;
      return newParams;
    });
  };

  const handleSubmit = async () => {
    if (isUploading || !selectedCamera || !selectedModel) {
      toast.error("Please select a camera and a model before processing", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
      return;
    }

    setIsUploading(true);

    const enabledRuleIds = rules
      .filter(rule => params[rule.rule] && rule.enabled)
      .map(rule => rule.id);

    const payload = {
      stream_url: selectedCamera.stream_url,
      save_output: saveOutput,
      enabled_rule_ids: enabledRuleIds
    };

    try {
      const res = await createMutation(payload);

      if ('data' in res && res.data) {
        const session_id = res.data.session_id;
        const rule_id = res.data.rule_id;
        const current_industry = res.data.industry;
        const current_sub_industry = res.data.sub_industry;

        dispatch(addSessionId({
          sessionId: session_id,
          industry: current_industry,
          ruleId: rule_id,
          subIndustry: current_sub_industry,
          videoPath: selectedCamera.camera_name
        }));

        toast.success(`Video processing started for session - ${session_id}`, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
        resetForm();
      } else if ('error' in res && res.error && 'data' in res.error && res.error.data && 'detail' in res.error.data) {
        toast.error(res.error.data.detail, {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      } else {
        toast.error("Failed to process video from camera stream.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      }
    } catch (error) {
      toast.error("Something went wrong while processing the stream.", {
        position: "top-right",
        autoClose: 5000,
        hideProgressBar: false,
        closeOnClick: false,
        pauseOnHover: true,
        draggable: true,
        progress: undefined,
        theme: "light",
        transition: Bounce,
      });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSubmitOutputConfigurations = (newOutputConfigurations: string[]) => {
    updateMutation(newOutputConfigurations).then((res) => {
      if ('data' in res && res.data) {
        toast.success("Output Configurations updated successfully!", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      } else if ('error' in res && res.error) {
        toast.error("Failed to update Output Configurations.", {
          position: "top-right",
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: false,
          pauseOnHover: true,
          draggable: true,
          progress: undefined,
          theme: "light",
          transition: Bounce,
        });
      }
    });
  };

  React.useEffect(() => {
    if (outputObject?.current_output_configurations) {
      setOutput(outputObject.current_output_configurations);
    }
  }, [outputObject]);

  return (
    <div className="p-6">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Media Source Section */}
        <div className="bg-white rounded-lg lg:col-span-2 shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Camera className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Camera Selection</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Select Camera
              </label>
              {loadingCameras ? (
                <div className="flex items-center">
                  <Loader />
                  <span className="ml-2">Loading cameras...</span>
                </div>
              ) : cameraData.length === 0 ? (
                <p className="text-gray-500">No cameras available</p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {cameraData.map((camera, index) => (
                    <div
                      key={index}
                      onClick={() => handleCameraSelect(camera)}
                      className={`p-4 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${selectedCamera?.camera_name === camera.camera_name ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                    >
                      <div className="flex items-center mb-2">
                        <Camera className="w-4 h-4 text-gray-700 mr-2" />
                        <span className="font-medium">{camera.camera_name}</span>
                      </div>
                      <p className="text-sm text-gray-600 mb-1">Location: {camera.location}</p>
                      <p className="text-xs text-gray-500 truncate">URL: {camera.stream_url}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="aspect-[16/9] bg-gray-100 rounded-lg flex items-center justify-center overflow">
              {loadingPreview ? (
                <div className="flex flex-col items-center">
                  <Loader />
                  <p className="mt-2 text-gray-500">Loading preview...</p>
                </div>
              ) : previewUrl ? (
                <MediaFrameSelector fileURL={previewUrl} isVideo={false} />
              ) : (
                <p className="text-gray-500">Select a camera to see preview</p>
              )}
            </div>
          </div>
        </div>

        {/* Detection Model Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Brain className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Detection Model</h2>
          </div>
          {!selectedIndustry || selectedIndustry === "" ? (
            <p className="text-gray-500">Please select an industry first</p>
          ) : modelLoading ? (
            <p className="text-gray-500">Loading models...</p>
          ) : modelRows.length === 0 ? (
            <p className="text-gray-500">No active models available</p>
          ) : (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Model
                </label>
                <select
                  className="w-full border border-gray-300 rounded-lg p-2"
                  value={selectedModel}
                  onChange={(e) => {
                    const modelId = e.target.value;
                    setSelectedModel(modelId);
                    dispatch(setDetectionModel(modelId));
                  }}
                >
                  <option value="" disabled>
                    Select a Model
                  </option>
                  {modelRows
                    .filter((model: DetectionModel) => model.active)
                    .map((model: DetectionModel) => (
                      <option key={model.id} value={model.id}>
                        {model.name} ({model.accuracy + " accuracy"})
                      </option>
                    ))}
                </select>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium mb-2">Model Information</h3>
                <p className="text-sm text-gray-600">
                  {selectedModel
                    ? modelRows.find((m: DetectionModel) => m.id === selectedModel)?.model_info || "No information available"
                    : "Please select a model to view its information"}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Processing Logic Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center gap-2 mb-4">
            <Cog className="w-5 h-5 text-blue-500" />
            <h2 className="text-lg font-semibold">Processing Logic</h2>
          </div>
          {!selectedIndustry || selectedIndustry === "" ? (
            <p className="text-gray-500 h-40">Please select an industry first</p>
          ) : !selectedModel || selectedModel === "" ? (
            <p className="text-gray-500 h-40">Please select a model first</p>
          ) : rulesByModelLoading ? (
            <p className="text-gray-500 h-40">Loading rules...</p>
          ) : rules.length === 0 ? (
            <p className="text-gray-500 h-40">No rules available for this model</p>
          ) : (
            <div className="space-y-4">
              {rules.map((rule: ProcessingRulesModel) => (
                <div
                  key={rule.id}
                  className={`flex items-center justify-between p-3 bg-gray-50 rounded-lg ${!rule.enabled ? "hidden" : ""}`}
                >
                  <div>
                    <p className="font-medium">{rule.rule}</p>
                    <p className="text-sm text-gray-600">
                      Threshold: {rule.threshold.toFixed(0)}%
                    </p>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      className="sr-only peer"
                      checked={params[rule.rule]}
                      onClick={() => toggleRule(rule.rule)}
                    />
                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                  </label>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Output Configuration Section */}
        <div className="bg-white rounded-lg shadow-md p-6 lg:col-span-2">
          <div className="flex items-center gap-2 mb-4">
            <DatabaseIcon className="w-5 h-5 text-blue-500" />
            <div className="flex justify-between w-[100%]">
              <h2 className="text-lg font-semibold">Output Configuration</h2>
              <div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={saveOutput}
                    onChange={() => {
                      setSaveOutput((prev) => {
                        const newValue = !prev;
                        dispatch(setIsToggled(newValue));
                        return newValue;
                      });
                    }}
                  />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Storage Location
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={output[0]}
                onChange={(e) => {
                  setOutput((prev) => [e.target.value, prev[1]]);
                  dispatch(setStorageLocation(e.target.value));
                }}
              >
                {outputObject.storage.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Output Format
              </label>
              <select
                className="w-full border border-gray-300 rounded-lg p-2"
                value={output[1]}
                onChange={(e) => {
                  setOutput((prev) => [prev[0], e.target.value]);
                  dispatch(setOutputFormat(e.target.value));
                }}
              >
                {outputObject.format.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="save-images"
                className="rounded"
                checked={isChecked}
                onChange={(e) => {
                  setIsChecked(prev => !prev);
                  dispatch(setSaveDetectionImages(e.target.checked));
                }}
              />
              <label htmlFor="save-images" className="text-sm text-gray-700">
                Save detection images
              </label>
            </div>
          </div>

          <div className="flex items-center justify-end">
            <div className="inline-block">
              <div
                className={`flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 cursor-pointer ${updateLoading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={!updateLoading ? () => handleSubmitOutputConfigurations(output) : (e) => e.preventDefault()}
              >
                {updateLoading ? (
                  <Loader />
                ) : (
                  <CircleFadingPlus className="w-5 h-5 text-white" />
                )}
                <h2 className="text-lg font-semibold">Set Output Configuration</h2>
              </div>
            </div>
          </div>
        </div>

        {/* Process Video Button */}
        <div className="bg-transparent p-1 lg:col-span-2">
          <div className="flex items-center justify-end">
            <div className="inline-block">
              <div
                className={`flex items-center gap-2 bg-blue-600 text-white hover:bg-blue-700 rounded-lg px-4 py-2 cursor-pointer ${createLoading || isUploading ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={!createLoading && !isUploading ? handleSubmit : (e) => e.preventDefault()}
              >
                {createLoading || isUploading ? (
                  <Loader />
                ) : (
                  <CircleFadingPlus className="w-5 h-5 text-white" />
                )}
                <h2 className="text-lg font-semibold">Process Video</h2>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Configuration;