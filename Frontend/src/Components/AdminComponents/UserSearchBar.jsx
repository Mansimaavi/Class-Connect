import { useState } from "react";
import { InputGroup, Form, Button } from "react-bootstrap";

const SearchBar = ({ onSearch, resetSearch }) => {
  const [searchQuery, setSearchQuery] = useState(""); // State for search query

  // Handle Search
  const handleSearch = async () => {
    if (searchQuery.trim()) {
      onSearch(searchQuery); // Call the onSearch function passed from the parent component
    } else {
      resetSearch(); // Reset the search if the query is empty
    }
  };

  

  return (
    <>
      {/* Search Bar */}
      <InputGroup className="mb-3">
        <Form.Control
          type="text"
          placeholder="Search by username, name, or email"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
        <Button variant="primary" onClick={handleSearch}>
          Search
        </Button>
      </InputGroup>
    </>
  );
};

export default SearchBar;