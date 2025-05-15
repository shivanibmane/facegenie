import { createApi, fetchBaseQuery } from "@reduxjs/toolkit/query/react";
import { base_url } from "../base_URL";

export const mediaProcessingApi = createApi({
  reducerPath: "mediaProcessingApi",
  baseQuery: fetchBaseQuery({
    baseUrl: base_url,
    prepareHeaders: (headers) => {
      headers.set("Accept", "application/json");
      headers.set("Content-Type", "application/json");
      return headers;
    },
  }),
  tagTypes: ["Media Processing"],
  endpoints: (builder) => ({
    createMediaProcessing: builder.mutation({
      query: (payload) => ({
        url: `/process-video/?save_output=${payload.save_output}`,
        method: "POST",
        body: {
          stream_url: payload.stream_url,
          enabled_rule_ids: payload.enabled_rule_ids,
          save_output: payload.save_output
        },
      }),
      invalidatesTags: ["Media Processing"],
    }),
  }),
});

export const { useCreateMediaProcessingMutation } = mediaProcessingApi;