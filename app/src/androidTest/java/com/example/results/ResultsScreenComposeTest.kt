package com.example.results

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.createComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.assertHeightIsAtLeast
import androidx.compose.ui.unit.dp
import org.junit.Rule
import org.junit.Test

class ResultsScreenComposeTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    @Test
    fun testVolverAJugarButtonHeight() {
        composeTestRule.setContent {
            ResultsScreen()
        }

        composeTestRule
            .onNodeWithText("Volver a Jugar")
            .assertIsDisplayed()
            .assertHeightIsAtLeast(48.dp)
    }
}
