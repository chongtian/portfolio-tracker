import { useState } from "react"
import { useGlobalLoading } from "../hooks/LoadingContext"
import { fetchNews } from "../services/api"
import { formatCurrency } from "../utils/formatCurrency"

export default function NewsList() {
    const { startLoading, stopLoading } = useGlobalLoading()
    const [data, setData] = useState([] as string[])

    useState(() => {
        startLoading()
        fetchNews().then(
            d => {
                if (d) {
                    const newsItems = d.map(n => {
                        if (n.newsType === 'OPTION') {
                            return `There are open options for ${n.instrumentId}. Price of ${n.instrumentId} is ${formatCurrency(n.currentPrice)}.`
                        } else if (n.newsType === 'DIV') {
                            return `Dividend event for ${n.instrumentId}. Record Date is ${n.recordDate}, Payment Date is ${n.paymentDate}, Amount is ${formatCurrency(n.dividendAmount)} per share.`
                        } else {
                            return ``
                        }
                    })
                    setData(newsItems)
                }
            }
        ).catch(
            err => {
                console.error(err)
            }
        ).finally(stopLoading)
    })

    return (
        <section className="info-card">
            <h2>News</h2>
            <ul className="list-disc pl-5">
                {data.map(d => (
                    <li><span>{d}</span></li>
                ))}
            </ul>
        </section>
    )
}