import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getErpnextConfig, isErpnextConfigured } from "./config";

export type JobOpening = {
  id: string;
  title: string;
  designation: string | null;
  department: string | null;
  location: string | null;
  employmentType: string | null;
  isOpen: boolean;
  postedOn: string | null;
  descriptionText: string;
  salaryRange: { lower: number; upper: number; currency: string; per: string } | null;
  // Full URL to this job's page on ERPNext's own public careers portal
  // (HRMS ships one at erp.x-sha.id/jobs/...) — that page already has a
  // working "Apply" flow for the public. The ERPNext *desk* Job Applicant
  // list (the internal HR review screen) requires an ERPNext login, so it
  // isn't linked from here at all.
  applyUrl: string;
};

type ErpJobOpening = {
  name: string;
  job_title: string;
  designation: string | null;
  department: string | null;
  location: string | null;
  employment_type: string | null;
  status: "Open" | "Closed";
  posted_on: string | null;
  description: string | null;
  route: string | null;
  currency: string | null;
  lower_range: number;
  upper_range: number;
  salary_per: string | null;
  publish_salary_range: number;
};

function stripHtml(html: string | null): string {
  if (!html) return "";
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export const getJobOpenings = createServerFn({ method: "GET" }).handler(
  async (): Promise<JobOpening[]> => {
    // Job postings don't change minute-to-minute — a few minutes of caching
    // is fine and saves hitting ERPNext on every page view.
    setResponseHeader("Cache-Control", "public, max-age=300, stale-while-revalidate=120");

    if (!isErpnextConfigured()) return [];

    const config = getErpnextConfig()!;
    const res = await erpRequest<{ data: ErpJobOpening[] }>("/api/resource/Job Opening", {
      params: {
        fields: jsonFields([
          "name",
          "job_title",
          "designation",
          "department",
          "location",
          "employment_type",
          "status",
          "posted_on",
          "description",
          "route",
          "currency",
          "lower_range",
          "upper_range",
          "salary_per",
          "publish_salary_range",
        ]),
        filters: jsonFilters([["publish", "=", 1]]),
        order_by: "posted_on desc",
        limit_page_length: "0",
      },
    });

    return res.data.map((j) => ({
      id: j.name,
      title: j.job_title,
      designation: j.designation,
      department: j.department,
      location: j.location,
      employmentType: j.employment_type,
      isOpen: j.status === "Open",
      postedOn: j.posted_on,
      descriptionText: stripHtml(j.description),
      salaryRange:
        j.publish_salary_range && (j.lower_range || j.upper_range)
          ? {
              lower: j.lower_range,
              upper: j.upper_range,
              currency: j.currency ?? "IDR",
              per: j.salary_per ?? "Month",
            }
          : null,
      applyUrl: `${config.url}/${j.route ?? ""}`,
    }));
  },
);
