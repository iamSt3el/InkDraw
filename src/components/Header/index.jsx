// components/organisms/Header/Header.jsx - Updated with data directory settings
import React, { useState, useEffect } from 'react'
import styles from './Header.module.scss'
import { BadgePlus, FolderOpen } from 'lucide-react'
import Button from '../atoms/Button/Button'

const Header = () => {



  return (
    <>
      <div className={styles.header_cover}>
        <div className={styles.header_title}>
          <h1>InkDrawo</h1>
        </div>

        {/* <div className={styles.header_searchBar}>
          <SearchBar />
        </div> */}

        <div className={styles.header_actions}>
          <Button 
            Icon={FolderOpen} 
            label={"Data Directory"} 
          />
          <Button 
            Icon={BadgePlus} 
            label={"New Notebook"} 
          />
        </div>
      </div>
    </>
  )
}

export default Header