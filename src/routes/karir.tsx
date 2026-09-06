import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";
import { SiteLayout } from "@/components/site-layout";
import { Icon } from "@/components/icon";
import { Reveal } from "@/components/reveal";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getJobOpenings, submitJobApplication, type JobOpening } from "@/lib/erpnext/careers";
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

const MAX_RESUME_BYTES = 5 * 1024 * 1024;

const applicationSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().min(1, "Email wajib diisi").email("Format email tidak valid"),
  phone: z.string().optional(),
  coverLetter: z.string().optional(),
});

type ApplicationValues = z.infer<typeof applicationSchema>;

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result.slice(result.indexOf(",") + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Karir() {
  const jobs = Route.useLoaderData();
  const openJobs = jobs.filter((j) => j.isOpen);
  const closedJobs = jobs.filter((j) => !j.isOpen);
  const sortedJobs = [...openJobs, ...closedJobs];
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

        {sortedJobs.length === 0 && (
          <p className="py-16 text-center text-on-surface-variant">
            Belum ada lowongan yang dibuka saat ini. Silakan cek kembali lain waktu.
          </p>
        )}

        <Reveal>
          <div className="flex flex-col gap-4">
            {sortedJobs.map((job) => (
              <div
                key={job.id}
                className={`rounded-2xl glass-panel p-6 transition-all ${
                  job.isOpen ? "hover-lift" : "opacity-60"
                }`}
              >
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-grow">
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h2 className="text-headline-md text-on-surface">{job.title}</h2>
                      <span
                        className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                          job.isOpen
                            ? "bg-success-container text-success"
                            : "bg-surface-container-high text-on-surface-variant"
                        }`}
                      >
                        {job.isOpen ? "Dibuka" : "Ditutup"}
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

                  {job.isOpen ? (
                    <button
                      type="button"
                      onClick={() => setApplyJob(job)}
                      className="flex shrink-0 items-center justify-center gap-2 rounded-xl primary-gradient px-6 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95"
                    >
                      Lamar Sekarang
                    </button>
                  ) : (
                    <span className="flex shrink-0 items-center justify-center rounded-xl border border-outline-variant px-6 py-3 font-semibold text-on-surface-variant">
                      Pendaftaran Ditutup
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Reveal>
      </div>

      <Dialog open={!!applyJob} onOpenChange={(open) => !open && setApplyJob(null)}>
        <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
          {applyJob && <ApplicationForm job={applyJob} onDone={() => setApplyJob(null)} />}
        </DialogContent>
      </Dialog>
    </SiteLayout>
  );
}

function ApplicationForm({ job, onDone }: { job: JobOpening; onDone: () => void }) {
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ApplicationValues>({ resolver: zodResolver(applicationSchema) });

  const onSubmit = async (values: ApplicationValues) => {
    if (resumeFile && resumeFile.size > MAX_RESUME_BYTES) {
      toast.error("Ukuran file CV maksimal 5MB.");
      return;
    }

    const result = await submitJobApplication({
      data: {
        jobId: job.id,
        name: values.name,
        email: values.email,
        phone: values.phone ?? "",
        coverLetter: values.coverLetter ?? "",
        resume: resumeFile
          ? {
              fileName: resumeFile.name,
              mimeType: resumeFile.type || "application/octet-stream",
              base64: await fileToBase64(resumeFile),
            }
          : null,
      },
    });

    if (!result.ok) {
      toast.error(result.message);
      return;
    }
    toast.success("Lamaran berhasil dikirim. Terima kasih!");
    onDone();
  };

  return (
    <>
      <DialogHeader>
        <DialogTitle>Lamar sebagai {job.title}</DialogTitle>
        <DialogDescription>
          Isi data diri kamu di bawah ini. Tim HR X-SHA akan menghubungi kandidat terpilih.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div>
          <label htmlFor="applicant-name" className="mb-1 block text-sm font-semibold">
            Nama Lengkap
          </label>
          <input
            id="applicant-name"
            {...register("name")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.name && <p className="mt-1 text-xs text-destructive">{errors.name.message}</p>}
        </div>

        <div>
          <label htmlFor="applicant-email" className="mb-1 block text-sm font-semibold">
            Email
          </label>
          <input
            id="applicant-email"
            type="email"
            {...register("email")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
          {errors.email && (
            <p className="mt-1 text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>

        <div>
          <label htmlFor="applicant-phone" className="mb-1 block text-sm font-semibold">
            Nomor HP
          </label>
          <input
            id="applicant-phone"
            type="tel"
            {...register("phone")}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="applicant-cover-letter" className="mb-1 block text-sm font-semibold">
            Pesan / Cover Letter
          </label>
          <textarea
            id="applicant-cover-letter"
            {...register("coverLetter")}
            rows={4}
            className="w-full rounded-lg border border-outline-variant px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
          />
        </div>

        <div>
          <label htmlFor="applicant-resume" className="mb-1 block text-sm font-semibold">
            CV / Resume (PDF, maks. 5MB)
          </label>
          <input
            id="applicant-resume"
            type="file"
            accept=".pdf,.doc,.docx"
            onChange={(e) => setResumeFile(e.target.files?.[0] ?? null)}
            className="w-full text-sm"
          />
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="mt-2 flex items-center justify-center gap-2 rounded-xl primary-gradient px-6 py-3 font-bold text-on-primary transition-all hover:brightness-110 active:scale-95 disabled:opacity-60"
        >
          {isSubmitting ? "Mengirim..." : "Kirim Lamaran"}
        </button>
      </form>
    </>
  );
}
