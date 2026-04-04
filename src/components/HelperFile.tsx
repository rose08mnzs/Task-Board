/// HelperFile.tsx
export function formatDueDate(dateStr: string) {
    const [year, month, day] = dateStr.split('-');
    return `${month}/${day}/${year}`;
}

export function parseDate(value?: string | null) {
    if (!value) return null;

    // handles "2026-04-04" and also "2026-04-04T00:00:00Z"
    const datePart = value.slice(0, 10);
    const [year, month, day] = datePart.split('-').map(Number);

    if (!year || !month || !day) return null;
    const finalDate = new Date(year, month - 1, day);
    //console.log('test date ', finalDate );
    //console.log('test status', finalDate < new Date()? 'overdue':'good');
    
    return finalDate;
}