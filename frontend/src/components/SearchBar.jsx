import React, { useState } from 'react';
import { InputGroup, FormControl, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const SearchBar = ({ onSearch }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();
  
  const handleSearch = (e) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      if (onSearch) {
        onSearch(searchTerm);
      } else {
        navigate(`/articles?search=${encodeURIComponent(searchTerm)}`);
      }
    }
  };
  
  return (
    <form onSubmit={handleSearch}>
      <InputGroup>
        <FormControl
          placeholder="Search articles..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="border-end-0"
        />
        <Button variant="outline-secondary" type="submit" className="border-start-0">
          <i className="bi bi-search"></i>
        </Button>
      </InputGroup>
    </form>
  );
};

export default SearchBar;