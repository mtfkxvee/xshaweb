import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { erpRequest, jsonFields, jsonFilters } from "./client";
import { getErpnextConfig, isErpnextConfigured } from "./config";

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

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

export type SubmitJobApplicationInput = {
  jobId: string;
  name: string;
  email: string;
  phone: string;
  coverLetter: string;
  resume: { fileName: string; mimeType: string; base64: string } | null;
};

export type SubmitJobApplicationResult = { ok: true } | { ok: false; message: string };

export const submitJobApplication = createServerFn({ method: "POST" })
  .validator((input: SubmitJobApplicationInput) => input)
  .handler(async ({ data }): Promise<SubmitJobApplicationResult> => {
    const config = getErpnextConfig();
    if (!config) return { ok: false, message: "ERPNext belum dikonfigurasi." };

    if (!data.name.trim() || !data.email.trim()) {
      return { ok: false, message: "Nama dan email wajib diisi." };
    }
    if (data.resume && data.resume.base64.length > MAX_RESUME_BYTES * 1.4) {
      return { ok: false, message: "Ukuran file CV maksimal 5MB." };
    }

    try {
      const created = await erpRequest<{ data: { name: string } }>("/api/resource/Job Applicant", {
        method: "POST",
        body: {
          applicant_name: data.name.trim(),
          email_id: data.email.trim(),
          phone_number: data.phone.trim() || null,
          job_title: data.jobId,
          cover_letter: data.coverLetter.trim() || null,
          country: "Indonesia",
          status: "Open",
        },
      });

      if (data.resume) {
        const bytes = Uint8Array.from(atob(data.resume.base64), (c) => c.charCodeAt(0));
        const form = new FormData();
        form.append("is_private", "1");
        form.append("doctype", "Job Applicant");
        form.append("docname", created.data.name);
        form.append("fieldname", "resume_attachment");
        form.append("file", new Blob([bytes], { type: data.resume.mimeType }), data.resume.fileName);

        // Raw fetch, not erpRequest — file uploads need a multipart body,
        // which erpRequest only supports as JSON.
        const uploadRes = await fetch(`${config.url}/api/method/upload_file`, {
          method: "POST",
          headers: { Authorization: `token ${config.apiKey}:${config.apiSecret}` },
          body: form,
        });
        if (!uploadRes.ok) {
          // The application itself is already saved — a resume upload
          // failure shouldn't be reported as a total failure.
          return { ok: true };
        }
      }

      return { ok: true };
    } catch (error) {
      return {
        ok: false,
        message: error instanceof Error ? error.message : "Gagal mengirim lamaran.",
      };
    }
  });
