import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { JobApplicationForm } from "@/components/job-application-form";
import { getJobOpening } from "@/lib/erpnext/careers";
import { formatIDR } from "@/lib/utils";

export const Route = createFileRoute("/karir_/$jobId")({
  loader: async ({ params }) => {
    const job = await getJobOpening({ data: { id: params.jobId } });
    if (!job) throw notFound();
    return job;
  },
  head: ({ loaderData }) => ({
    meta: loaderData
      ? [
          { title: `${loaderData.title} | Karir X-SHA` },
          {
            name: "description",
            content: loaderData.descriptionText || `Lowongan kerja ${loaderData.title} di X-SHA.`,
          },
        ]
      : [],
  }),
  component: JobDetail,
});

function formatDate(value: string | null): string | null {
  if (!value) return null;
  return new Date(value).toLocaleDateString("id-ID", { dateStyle: "long" });
}

function JobDetail() {
  // getJobOpening already returns null (→ notFound) for closed positions —
  // this page never renders for one.
  const job = Route.useLoaderData();
  const [applying, setApplying] = useState(false);
  const postedOn = formatDate(job.postedOn);
  const closesOn = formatDate(job.closesOn);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-3xl px-gutter pb-stack-lg">
        <Link
          to="/karir"
          className="mb-6 inline-block text-sm font-bold text-primary hover:underline"
        >
          ← Kembali ke Karir
        </Link>

        {job.imageUrl && (
          <div className="mb-6 aspect-video overflow-hidden rounded-3xl">
            <img src={job.imageUrl} alt={job.title} className="h-full w-full object-cover" />
          </div>
        )}

        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">{job.title}</h1>
          <span className="rounded-full bg-success-container px-2.5 py-0.5 text-[11px] font-bold uppercase text-success">
            Dibuka
          </span>
        </div>

        <div className="mb-6 flex flex-wrap gap-x-6 gap-y-2 text-sm text-on-surface-variant">
          {job.department && (
            <span className="flex items-center gap-1.5">
              <Icon name="apartment" className="text-[18px]" />
              {job.department}
            </span>
          )}
          {job.location && (
            <span className="flex items-center gap-1.5">
              <Icon name="location_on" className="text-[18px]" />
              {job.location}
            </span>
          )}
          {job.employmentType && (
            <span className="flex items-center gap-1.5">
              <Icon name="schedule" className="text-[18px]" />
              {job.employmentType}
            </span>
          )}
          {job.salaryRange && (
            <span className="flex items-center gap-1.5 font-semibold text-primary">
              <Icon name="payments" className="text-[18px]" />
              {formatIDR(job.salaryRange.lower)} – {formatIDR(job.salaryRange.upper)} /{" "}
              {job.salaryRange.per === "Month" ? "bulan" : "tahun"}
            </span>
          )}
          {postedOn && (
            <span className="flex items-center gap-1.5">
              <Icon name="event_available" className="text-[18px]" />
              Dibuka {postedOn}
            </span>
          )}
          {closesOn && (
            <span className="flex items-center gap-1.5">
              <Icon name="event_busy" className="text-[18px]" />
              Batas lamaran {closesOn}
            </span>
          )}
        </div>

        {job.descriptionHtml && (
          <div
            className="prose max-w-none text-on-surface"
            dangerouslySetInnerHTML={{ __html: job.descriptionHtml }}
          />
        )}

        <div className="mt-8">
          <button
            type="button"
            onClick={() => setApplying(true)}
            className="flex items-center justify-center gap-2 rounded-xl primary-gradient px-8 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
          >
            Lamar Sekarang
          </button>
        </div>
      </div>

      <Dialog open={applying} onOpenChange={setApplying}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          <JobApplicationForm job={job} onDone={() => setApplying(false)} />
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
