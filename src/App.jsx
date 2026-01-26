import React, { useRef, useEffect, useState } from 'react'
import './App.css'
import { Box, Button, IconButton, OutlinedInput, Stack, Typography } from '@mui/material'
import { Close, Search } from '@mui/icons-material'

function App() {
	const [search, setSearch] = useState('')
	const [inputWidth, setInputWidth] = useState(150)
	const [inProgress, setInProgress] = useState(false)
	const [results, setResults] = useState([])
	const [selectedResultIndex, setSelectedResultIndex] = useState(0)
	const spanRef = useRef(null)

	useEffect(() => {
		if (spanRef.current) {
			const width = Math.min(Math.max(spanRef.current.offsetWidth + 50, 150), window.innerWidth * 0.5)
			setInputWidth(width)
		}
	}, [search])

	const handleSearch = async () => {
		if (!search.trim()) return;
		setInProgress(true);
		setResults([]);

		try {
			const response = await fetch(`https://book-pdf-finder.onrender.com/search?q=${encodeURIComponent(search.trim())}`);
			const data = await response.json();
			setResults(data.results || []);
		} catch (err) {
			console.error(err);
		} finally {
			setInProgress(false);
		}
	};

	return (
		<Stack
			direction="column"
			width="90vw"
			height="90vh"
			justifyContent="center"
			alignItems="center"
			spacing={2}
			position='relative'
		>
			<span
				ref={spanRef}
				style={{
					position: 'absolute',
					visibility: 'hidden',
					whiteSpace: 'pre',
					fontSize: '1rem',
					fontWeight: 400,
				}}
			>
				{search || 'Título do Livro'}
			</span>

			<Stack direction='row' spacing={1}>
				<OutlinedInput
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					placeholder="Título do Livro"
					onKeyPress={(e) => {
						if (e.key === 'Enter') {
							handleSearch()
						}
					}}
					sx={{
						bgcolor: '#242424',
						color: 'white',
						textAlign: 'center',
						width: `${inputWidth}px`,
						transition: 'width 0.1s',
						'& > *': {
							borderColor: 'white !important',
							textAlign: 'center',
						},
					}}
				/>

				<Button loading={inProgress} variant='contained' onClick={handleSearch} sx={{ bgcolor: 'white', color: '#242424', fontWeight: 'bold' }}>
					<Search />
				</Button>
				{results.length > 0 && (
					<Button variant='contained' onClick={() => { setSearch(''); setResults([]); setSelectedResultIndex(0); }} sx={{ bgcolor: 'white', color: '#242424', fontWeight: 'bold' }}>
						<Close />
					</Button>
				)}
			</Stack>

			<Stack direction='row' overflow='auto' spacing={2} maxWidth='80vw' minHeight='50px' maxHeight='150px'>
				{results?.map((result, index) => (
					<Box
						key={index}
						onClick={() => setSelectedResultIndex(index)}
						sx={{
							border: selectedResultIndex === index ? '3px solid white' : '1px solid gray',
							borderRadius: '8px',
							padding: '8px',
							cursor: 'pointer',
							bgcolor: '#333333',
							minHeight: '50px',
						}}
					>
						<Typography sx={{ color: 'white', fontSize: 14 }}>
							{result.length > 50 ? result.slice(0, 50) + '...' : result}
						</Typography>
					</Box>
				))}
			</Stack>

			{results[selectedResultIndex] && (
				<Box sx={{ width: '80%', flexGrow: 1, border: '1px solid #555' }}>
					<iframe
						src={results[selectedResultIndex]}
						width="100%"
						height="100%"
						title="PDF Preview"
						style={{ border: 'none' }}
					/>
				</Box>
			)}
		</Stack >
	)
}

export default App
