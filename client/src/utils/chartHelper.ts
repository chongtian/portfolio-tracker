export const pieChartColors: string[] = [
    '#4E79A7',
    '#F28E2B',
    '#59A14F',
    '#E15759',
    '#B07AA1',
    '#76B7B2',
    '#EDC948',
    '#9C755F',
    '#BAB0AC'
];

export function cleanUpPieData(
    data: { name: string, value: number | undefined }[],
    limit: number): { name: string, value: number | undefined }[] {

    // merge options
    const optionItems = data.filter((item) => item.name.length > 10)
    if (optionItems.length > 0) {
        const optionValue = optionItems.reduce((sum, item) => sum + (item.value || 0), 0)
        data = data.filter((item) => item.name.length <= 10)
        data.push({ name: 'Options', value: optionValue })
    }

    // sort descending
    data.sort((a, b) => (b.value || 0) - (a.value || 0));

    // retain the first (limit-1) records, the remaining ones are combined into one
    if (data.length > limit) {
        const others = data.slice(limit - 1).reduce((sum, d) => sum + (d.value || 0), 0)
        return [...data.slice(0, limit - 2), { name: 'Others', value: others }]
    }

    return data;

}