import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { JobApplicationForm } from "@/components/job-application-form";
import { getJobOpenings, type JobOpening } from "@/lib/erpnext/careers";
import { formatIDR } from "@/lib/utils";

export const Route = createFileRoute("/karir")({
  // SSR'd (not a client-only query) so job postings are actually
  // discoverable in the raw HTML — same reasoning as the blog list fix.
  loader: () => getJobOpenings(),
  head: () => ({
    meta: [
      { title: "Karir | X-SHA" },
      {
        name: "description",
        content:
          "Lowongan kerja terbuka di X-SHA — bergabung dengan tim ritel heritage Tasikmalaya.",
      },
    ],
  }),
  component: Karir,
});

function Karir() {
  // getJobOpenings already only returns published, still-open positions —
  // closed ones are never shown here at all.
  const jobs = Route.useLoaderData();
  const [applyJob, setApplyJob] = useState<JobOpening | null>(null);

  return (
    <SiteLayout>
      <div className="mx-auto max-w-container-max px-gutter pb-stack-lg">
        <header className="mb-stack-lg">
          <h1 className="font-display text-headline-lg-mobile md:text-display-lg">Karir</h1>
          <p className="mt-2 max-w-2xl text-body-lg text-on-surface-variant">
            Bergabung dengan tim X-SHA — lowongan kerja yang sedang dibuka di seluruh outlet dan
            kantor kami.
          </p>
        </header>

        {jobs.length === 0 && (
          <p className="py-16 text-center text-on-surface-variant">
            Belum ada lowongan yang dibuka saat ini. Silakan cek kembali lain waktu.
          </p>
        )}

        <Reveal>
          <div className="flex flex-col gap-4">
            {jobs.map((job) => (
              <Link
                key={job.id}
                to="/karir/$jobId"
                params={{ jobId: job.id }}
                className="block rounded-2xl glass-panel p-6 transition-all hover-lift"
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  {job.imageUrl && (
                    <div className="h-20 w-20 shrink-0 overflow-hidden rounded-xl sm:order-first">
                      <img src={job.imageUrl} alt={job.title} className="h-full w-full object-cover" />
                    </div>
                  )}
                  <div className="flex-grow">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-headline-md text-on-surface">{job.title}</h2>
                      <span className="rounded-full bg-success-container px-2.5 py-0.5 text-[11px] font-bold uppercase text-success">
                        Dibuka
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-on-surface-variant">
                      {job.department && (
                        <span className="flex items-center gap-1">
                          <Icon name="apartment" className="text-[16px]" />
                          {job.department}
                        </span>
                      )}
                      {job.location && (
                        <span className="flex items-center gap-1">
                          <Icon name="location_on" className="text-[16px]" />
                          {job.location}
                        </span>
                      )}
                      {job.employmentType && (
                        <span className="flex items-center gap-1">
                          <Icon name="schedule" className="text-[16px]" />
                          {job.employmentType}
                        </span>
                      )}
                      {job.salaryRange && (
                        <span className="flex items-center gap-1 font-semibold text-primary">
                          <Icon name="payments" className="text-[16px]" />
                          {formatIDR(job.salaryRange.lower)} – {formatIDR(job.salaryRange.upper)} /{" "}
                          {job.salaryRange.per === "Month" ? "bulan" : "tahun"}
                        </span>
                      )}
                    </div>
                    {job.descriptionText && (
                      <p className="line-clamp-2 text-sm text-on-surface-variant">
                        {job.descriptionText}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setApplyJob(job);
                    }}
                    className="flex shrink-0 items-center justify-center gap-2 rounded-xl primary-gradient px-6 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
                  >
                    Lamar Sekarang
                  </button>
                </div>
              </Link>
            ))}
          </div>
        </Reveal>
      </div>

      <Dialog open={!!applyJob} onOpenChange={(open) => !open && setApplyJob(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {applyJob && <JobApplicationForm job={applyJob} onDone={() => setApplyJob(null)} />}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}
