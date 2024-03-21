import Link from 'next/link'

export default async function Crud() {
    const resp = await fetch('http://localhost:9999/topics');
    const topics = await resp.json();

    return (
        <>
        <ol>     
        {topics.map((topic)=>{
          return <li key={topic.id}><Link href={`/read/${topic.id}`}>{topic.title}</Link></li>
        })}
        </ol>
        
        <ul>
          <li><Link href="/create">Create</Link></li>
          <li><Link href="/update/1">Update</Link></li>
          <li><input type="button" value="delete" /></li>
        </ul>
        </>
    )
}
