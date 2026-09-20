package worker



func (w *Worker) judge(job model.Job) (string, error) {
    limits, err := loadLimits(...)
    if err != nil {
        return "", err
    }

    sb, err := w.createSandbox(job, limits)
    if err != nil {
        return "", err
    }

    defer w.cleanupSandbox(sb)

    return w.process(job, limits, sb)
}